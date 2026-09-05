/**
 * LAN WebSocket transport for seat-authenticated UserClients.
 *
 * HostRuntime owns authentication, authorization, projections and business
 * commands. This module only owns the socket lifecycle and translates the
 * wire protocol to that runtime API. Displays connect to their Chair directly
 * and never connect here.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import { WebSocketServer, WebSocket, type RawData } from 'ws'
import { createLogger } from './logger'
import { getAdvertisedConference } from './lan-service'
import { HostRuntime, type HostRuntimeEvent } from './host-runtime'
import {
  isHostClientMessage,
  type HostClientMessage,
  type HostError,
  type HostQuery,
  type HostServerMessage
} from '../../../shared/host-protocol'
import type {
  ChairCommitteeProjection,
  UserClientSessionProjection,
  WorkflowAudienceProjection
} from '../../../shared/content-types'

const log = createLogger('HostServiceWs')

const DEFAULT_PORT = 19527
const MAX_RETRY = 99
const AUTH_TIMEOUT_MS = 15_000
const MAX_MESSAGE_BYTES = 64 * 1024

export interface AuthenticatedUserClient {
  readonly ws: WebSocket
  readonly authenticated: true
  readonly sessionId: string
  readonly conferenceId: string
  readonly seatId: string
}

interface PendingClient {
  ws: WebSocket
  authenticated: false
  authTimeout: NodeJS.Timeout
}

type ConnectedUserClient = AuthenticatedUserClient | PendingClient

let wss: WebSocketServer | null = null
let httpServer: Server | null = null
let runtime: HostRuntime | null = null
let unsubscribeRuntime: (() => void) | null = null

const clients = new Map<WebSocket, ConnectedUserClient>()
const clientsBySession = new Map<string, AuthenticatedUserClient>()
const clientsBySeat = new Map<string, AuthenticatedUserClient>()

/**
 * Sets the single HostRuntime that receives all UserClient requests.
 * It may be called before or after the LAN server starts.
 */
export function setHostRuntime(nextRuntime: HostRuntime | null): void {
  unsubscribeRuntime?.()
  unsubscribeRuntime = null
  runtime = nextRuntime

  if (runtime) {
    unsubscribeRuntime = runtime.subscribe(handleRuntimeEvent)
  }
}

export function getAuthenticatedClients(): AuthenticatedUserClient[] {
  return [...clientsBySession.values()]
}

/**
 * Starts the Host Service LAN endpoint. The legacy name is retained for the
 * Electron main-process lifecycle; it no longer creates a Display endpoint.
 */
export function startDisplayWs(hostRuntime?: HostRuntime): Promise<number> {
  if (hostRuntime) setHostRuntime(hostRuntime)
  if (httpServer) return Promise.resolve(getDisplayWsPort())

  return new Promise((resolve, reject) => {
    const tryListen = (port: number): void => {
      const server = createServer(handleLanHttpRequest)
      const socketServer = new WebSocketServer({
        noServer: true,
        maxPayload: MAX_MESSAGE_BYTES
      })

      server.on('upgrade', (request, socket, head) => {
        if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/') {
          socket.destroy()
          return
        }

        socketServer.handleUpgrade(request, socket, head, (ws, upgradedRequest) => {
          socketServer.emit('connection', ws, upgradedRequest)
        })
      })

      socketServer.on('connection', handleConnection)
      socketServer.on('error', (error) => log.error('WebSocket server error:', error))

      server.once('listening', () => {
        httpServer = server
        wss = socketServer
        log.info(`Host Service LAN endpoint listening on http://0.0.0.0:${port}`)
        resolve(port)
      })

      server.once('error', (error: NodeJS.ErrnoException) => {
        socketServer.close()
        if (error.code === 'EADDRINUSE' && port < DEFAULT_PORT + MAX_RETRY) {
          tryListen(port + 1)
          return
        }
        reject(error)
      })

      server.listen(port, '0.0.0.0')
    }

    tryListen(DEFAULT_PORT)
  })
}

function handleConnection(ws: WebSocket): void {
  const client: PendingClient = {
    ws,
    authenticated: false,
    authTimeout: setTimeout(() => {
      sendError(ws, 'unauthenticated', '认证超时')
      ws.close(1008, 'authentication required')
    }, AUTH_TIMEOUT_MS)
  }
  clients.set(ws, client)

  ws.on('message', (data: RawData) => {
    void handleMessage(ws, data)
  })
  ws.on('close', () => handleClose(ws))
  ws.on('error', (error) => log.warn(`UserClient connection error: ${error.message}`))
}

async function handleMessage(ws: WebSocket, rawData: RawData): Promise<void> {
  const message = parseMessage(rawData)
  if (!message) {
    rejectProtocol(ws, 'invalid_command', '消息必须是 JSON 对象')
    return
  }

  const client = clients.get(ws)
  if (!client) return

  if (!client.authenticated) {
    if (message.type !== 'auth') {
      rejectProtocol(ws, 'unauthenticated', '请先认证')
      return
    }
    await authenticate(ws, client, message)
    return
  }

  if (message.type === 'auth') {
    sendError(ws, 'invalid_command', '当前连接已经完成认证', message.requestId)
    return
  }

  if (message.type === 'execute') {
    await runRequest(ws, client, message, 'execute')
    return
  }

  if (message.type === 'query') {
    await runRequest(ws, client, message, 'query')
    return
  }
}

async function authenticate(
  ws: WebSocket,
  client: PendingClient,
  message: Extract<HostClientMessage, { type: 'auth' }>
): Promise<void> {
  if (!runtime) {
    send(ws, {
      type: 'auth_result',
      requestId: message.requestId,
      success: false,
      error: { code: 'no_active_conference', message: 'Host Service 尚未就绪' }
    })
    return
  }

  let result: ReturnType<HostRuntime['authenticate']>
  try {
    result = runtime.authenticate({ inviteCode: message.inviteCode, password: message.password })
  } catch (error) {
    log.error('UserClient authentication failed:', error)
    send(ws, {
      type: 'auth_result',
      requestId: message.requestId,
      success: false,
      error: { code: 'unauthenticated', message: '认证服务错误' }
    })
    return
  }

  if (!result.ok) {
    send(ws, {
      type: 'auth_result',
      requestId: message.requestId,
      success: false,
      error: result.error
    })
    return
  }

  clearTimeout(client.authTimeout)
  evictPriorSeatConnection(result.session.seatId, ws)

  const authenticatedClient: AuthenticatedUserClient = {
    ws,
    authenticated: true,
    sessionId: result.session.sessionId,
    conferenceId: result.session.conferenceId,
    seatId: result.session.seatId
  }
  clients.set(ws, authenticatedClient)
  clientsBySession.set(authenticatedClient.sessionId, authenticatedClient)
  clientsBySeat.set(authenticatedClient.seatId, authenticatedClient)

  send(ws, {
    type: 'auth_result',
    requestId: message.requestId,
    success: true,
    session: result.session
  })
}

async function runRequest(
  ws: WebSocket,
  client: AuthenticatedUserClient,
  message: Extract<HostClientMessage, { type: 'execute' | 'query' }>,
  method: 'execute' | 'query'
): Promise<void> {
  if (!runtime) {
    sendError(ws, 'no_active_conference', 'Host Service 尚未就绪', message.requestId)
    return
  }

  try {
    const actor = { kind: 'user_client' as const, sessionId: client.sessionId }
    if (method === 'execute' && message.type === 'execute') {
      const result = runtime.execute(actor, {
        requestId: message.requestId,
        idempotencyKey: message.idempotencyKey,
        command: message.command
      })
      send(ws, { type: 'command_result', requestId: message.requestId, result })
      return
    }
    if (method === 'query' && message.type === 'query') {
      sendQueryResult(ws, message.requestId, message.query, runtime.query(actor, message.query))
      return
    }

    sendError(ws, 'invalid_command', '消息类型与请求不匹配', message.requestId)
  } catch (error) {
    log.warn(
      `UserClient ${method} failed: ${error instanceof Error ? error.message : String(error)}`
    )
    sendError(ws, 'invalid_command', '请求未能完成', message.requestId)
  }
}

function handleRuntimeEvent(event: HostRuntimeEvent): void {
  if (event.type === 'session_revoked') {
    const client = clientsBySession.get(event.sessionId)
    if (!client) return
    send(client.ws, { type: 'session_revoked', reason: event.reason })
    client.ws.close(1008, 'session revoked')
    return
  }

  for (const connected of clientsBySession.values()) {
    if (connected.conferenceId === event.conferenceId) refreshProjection(connected)
  }
}

function refreshProjection(client: AuthenticatedUserClient): void {
  if (!runtime) return
  const actor = { kind: 'user_client' as const, sessionId: client.sessionId }
  const projection = runtime.query(actor, { type: 'session_projection' })
  if (!isHostError(projection)) {
    send(client.ws, {
      type: 'projection',
      requestId: 'push:projection',
      projection: projection as UserClientSessionProjection
    })
  }

  const workflow = runtime.query(actor, { type: 'workflow_queue' })
  if (!isHostError(workflow)) {
    send(client.ws, {
      type: 'workflow_queue',
      requestId: 'push:workflow_queue',
      projection: workflow as WorkflowAudienceProjection
    })
  }
}

function sendQueryResult(
  ws: WebSocket,
  requestId: string,
  query: HostQuery,
  result: ReturnType<HostRuntime['query']>
): void {
  if (isHostError(result)) {
    sendError(ws, result.code, result.message, requestId, result.field)
    return
  }

  if (query.type === 'session_projection') {
    send(ws, {
      type: 'projection',
      requestId,
      projection: result as UserClientSessionProjection
    })
    return
  }
  if (query.type === 'workflow_queue') {
    send(ws, {
      type: 'workflow_queue',
      requestId,
      projection: result as WorkflowAudienceProjection
    })
    return
  }
  send(ws, {
    type: 'chair_projection',
    requestId,
    projection: result as ChairCommitteeProjection
  })
}

function evictPriorSeatConnection(seatId: string, nextSocket: WebSocket): void {
  const previous = clientsBySeat.get(seatId)
  if (!previous || previous.ws === nextSocket) return

  // Remove the old session before closing its socket so an immediate observer
  // cannot see two active UserClients for one Seat.
  clients.delete(previous.ws)
  if (clientsBySession.get(previous.sessionId) === previous) {
    clientsBySession.delete(previous.sessionId)
  }
  if (clientsBySeat.get(previous.seatId) === previous) {
    clientsBySeat.delete(previous.seatId)
  }
  send(previous.ws, { type: 'session_revoked', reason: 'replaced' })
  previous.ws.close(1008, 'superseded by another login')
}

function handleClose(ws: WebSocket): void {
  const client = clients.get(ws)
  clients.delete(ws)
  if (!client) return

  if (!client.authenticated) {
    clearTimeout(client.authTimeout)
    return
  }

  if (clientsBySession.get(client.sessionId) === client) {
    clientsBySession.delete(client.sessionId)
  }
  if (clientsBySeat.get(client.seatId) === client) {
    clientsBySeat.delete(client.seatId)
  }
  runtime?.disconnect(client.sessionId)
}

function parseMessage(rawData: RawData): HostClientMessage | null {
  try {
    const raw = Buffer.isBuffer(rawData)
      ? rawData.toString()
      : Array.isArray(rawData)
        ? Buffer.concat(rawData).toString()
        : Buffer.from(rawData).toString()
    const parsed: unknown = JSON.parse(raw)
    return isHostClientMessage(parsed) && typeof parsed.requestId === 'string' ? parsed : null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHostError(value: unknown): value is HostError {
  return isRecord(value) && typeof value.code === 'string' && typeof value.message === 'string'
}

function rejectProtocol(ws: WebSocket, code: HostError['code'], message: string): void {
  sendError(ws, code, message)
  ws.close(1008, message)
}

function sendError(
  ws: WebSocket,
  code: HostError['code'],
  message: string,
  requestId?: string,
  field?: string
): void {
  const error: HostError = { code, message, ...(field ? { field } : {}) }
  send(ws, { type: 'error', error, ...(requestId ? { requestId } : {}) })
}

function send(ws: WebSocket, message: HostServerMessage): void {
  if (ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(JSON.stringify(message))
  } catch (error) {
    log.warn(
      `Failed to send UserClient message: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  })
  response.end(JSON.stringify(body))
}

function handleLanHttpRequest(request: IncomingMessage, response: ServerResponse): void {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' })
    response.end()
    return
  }

  const requestPath = new URL(request.url ?? '/', 'http://localhost').pathname
  if (requestPath === '/__veto/health') {
    sendJson(response, 200, {
      status: 'ok',
      server: 'veto.lan',
      conference: getAdvertisedConference()
    })
    return
  }

  sendJson(response, 404, { error: 'not_found' })
}

/** Stops the Host Service LAN endpoint and closes every UserClient session. */
export function stopDisplayWs(): Promise<void> {
  return new Promise((resolve) => {
    for (const client of clients.values()) {
      if (!client.authenticated) clearTimeout(client.authTimeout)
      client.ws.terminate()
    }
    clients.clear()
    clientsBySession.clear()
    clientsBySeat.clear()

    const socketServer = wss
    const server = httpServer
    wss = null
    httpServer = null

    const closeHttp = (): void => {
      if (!server) {
        resolve()
        return
      }
      server.close(() => resolve())
    }

    if (!socketServer) {
      closeHttp()
      return
    }
    socketServer.close(closeHttp)
  })
}

/** The legacy name is retained for existing Electron lifecycle callers. */
export function getDisplayWsPort(): number {
  const address = httpServer?.address()
  return address && typeof address !== 'string' ? address.port : 0
}
