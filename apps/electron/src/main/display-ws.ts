/**
 * Dedicated Chair-to-Display WebSocket transport.
 *
 * This link intentionally owns no conference state: the Chair renderer
 * projects local meeting state, and a Display renderer subscribes to that
 * projection.
 */

import { createServer, type IncomingMessage, type Server } from 'http'
import { WebSocketServer, WebSocket, type RawData } from 'ws'
import { createLogger } from './logger'

const log = createLogger('DisplayWs')

const DEFAULT_PORT = 19528
const MAX_RETRY = 99
const MAX_MESSAGE_BYTES = 1024 * 1024

type DisplayClientRole = 'chair' | 'display'

interface DisplayClient {
  role: DisplayClientRole
  committeeId?: string
}

interface DisplaySocketMessage {
  type: 'display_data' | 'timer_tick'
  committeeId: string
  data?: unknown
}

let httpServer: Server | null = null
let wss: WebSocketServer | null = null
let port: number | null = null

const clients = new Map<WebSocket, DisplayClient>()
const latestDisplayData = new Map<string, string>()

export function getDisplayWsPort(): number | null {
  return port
}

export async function startDisplayWs(): Promise<number> {
  if (httpServer && wss && port !== null) return port

  return new Promise((resolve, reject) => {
    let currentPort = DEFAULT_PORT

    const tryListen = (): void => {
      const server = createServer()
      const socketServer = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES })

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
        port = currentPort
        log.info(`Display WS listening on ws://0.0.0.0:${currentPort}`)
        resolve(currentPort)
      })

      server.once('error', (error: NodeJS.ErrnoException) => {
        socketServer.close()
        if (error.code === 'EADDRINUSE' && currentPort < DEFAULT_PORT + MAX_RETRY) {
          currentPort += 1
          tryListen()
          return
        }
        reject(error)
      })

      server.listen(currentPort)
    }

    tryListen()
  })
}

export async function stopDisplayWs(): Promise<void> {
  const socketServer = wss
  const server = httpServer
  wss = null
  httpServer = null
  port = null

  for (const [ws] of clients) {
    clients.delete(ws)
    ws.close(1001, 'display service stopped')
  }
  latestDisplayData.clear()

  await Promise.all([
    new Promise<void>((resolve) => socketServer?.close(() => resolve())),
    new Promise<void>((resolve) => server?.close(() => resolve()))
  ])
}

function handleConnection(ws: WebSocket, request: IncomingMessage): void {
  let url: URL
  try {
    url = new URL(request.url ?? '/', 'http://localhost')
  } catch {
    ws.close(1008, 'invalid request')
    return
  }

  const role = url.searchParams.get('role')
  if (role !== 'chair' && role !== 'display') {
    ws.close(1008, 'invalid display role')
    return
  }

  const committeeId = url.searchParams.get('committeeId') ?? undefined
  clients.set(ws, { role, committeeId })

  if (role === 'display' && committeeId) {
    const latest = latestDisplayData.get(committeeId)
    if (latest && ws.readyState === WebSocket.OPEN) ws.send(latest)
  }

  ws.on('message', (data: RawData) => handleChairMessage(ws, data))
  ws.on('close', () => clients.delete(ws))
  ws.on('error', () => ws.close())
}

function handleChairMessage(ws: WebSocket, rawData: RawData): void {
  const sender = clients.get(ws)
  if (sender?.role !== 'chair') return

  let message: DisplaySocketMessage
  try {
    message = JSON.parse(rawData.toString()) as DisplaySocketMessage
  } catch {
    return
  }

  if (
    (message.type !== 'display_data' && message.type !== 'timer_tick') ||
    typeof message.committeeId !== 'string'
  ) {
    return
  }

  broadcast(message)
}

function broadcast(message: DisplaySocketMessage): void {
  const payload = JSON.stringify(message)
  if (message.type === 'display_data' && message.committeeId) {
    latestDisplayData.set(message.committeeId, payload)
  }

  for (const [ws, client] of clients) {
    if (client.role !== 'display') continue
    if (client.committeeId && message.committeeId && client.committeeId !== message.committeeId) {
      continue
    }
    if (ws.readyState === WebSocket.OPEN) ws.send(payload)
  }
}
