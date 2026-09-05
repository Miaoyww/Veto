/**
 * UserClient connection to the Host Service.
 *
 * This module intentionally owns no conference state. The Host is the only
 * authority; this client only forwards commands and exposes its authorized
 * projections to the delegate route.
 */

import type {
  AuthenticatedSeatSession,
  ChairCommitteeProjection,
  HostError,
  HostExecuteResult,
  Directive,
  News,
  SituationUpdate,
  UserClientSessionProjection,
  WorkflowAudienceProjection
} from '../../../../../shared'
import {
  isHostServerMessage,
  type HostClientMessage,
  type HostServerMessage,
  type UserClientCommand
} from '../../../../../shared'

const DEFAULT_WS_PORT = 19527

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface UserClientCallbacks {
  onAuthenticated?: (session: AuthenticatedSeatSession) => void
  onAuthError?: (error: HostError) => void
  onProjection?: (projection: UserClientSessionProjection) => void
  onWorkflowQueue?: (projection: WorkflowAudienceProjection) => void
  onChairProjection?: (projection: ChairCommitteeProjection) => void
  onContentChanged?: (content: Directive | News | SituationUpdate) => void
  onCommandResult?: (result: HostExecuteResult) => void
  onSessionRevoked?: (reason: 'replaced' | 'permissions_changed' | 'conference_switched' | 'host_shutdown') => void
  onError?: (error: HostError) => void
  onConnectionStatus?: (status: ConnectionStatus) => void
}

let wsPort: number | null = null
let externalWsUrl: string | null = null
let currentClient: UserClient | null = null

/** Read the packaged Host Service port when running inside Electron. */
export async function initWsPort(): Promise<number> {
  if (wsPort !== null) return wsPort
  if (typeof window !== 'undefined' && window.veto?.ws) {
    const port = await window.veto.ws.getPort()
    wsPort = port
    return port
  }
  wsPort = DEFAULT_WS_PORT
  return wsPort
}

export function getWsPort(): number {
  return wsPort ?? DEFAULT_WS_PORT
}

export function getUserClientWsUrl(): string {
  return externalWsUrl ?? `ws://localhost:${getWsPort()}`
}

/** Set the Host endpoint selected through LAN discovery. */
export function setUserClientWsUrl(url: string | null): void {
  if (externalWsUrl === url) return
  externalWsUrl = url
  currentClient?.disconnect()
}

function createRequestId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export class UserClient {
  private ws: WebSocket | null = null
  private callbacks: UserClientCallbacks = {}
  private status: ConnectionStatus = 'disconnected'
  private closedExplicitly = false

  setCallbacks(callbacks: UserClientCallbacks): void {
    this.callbacks = callbacks
    callbacks.onConnectionStatus?.(this.status)
  }

  authenticate(inviteCode: string, password?: string): void {
    this.closedExplicitly = false
    const requestId = createRequestId()
    this.open(() => {
      this.send({
        type: 'auth',
        requestId,
        inviteCode,
        password,
        clientKind: 'user_client'
      })
    })
  }

  querySessionProjection(): void {
    this.send({ type: 'query', requestId: createRequestId(), query: { type: 'session_projection' } })
  }

  queryWorkflowQueue(): void {
    this.send({ type: 'query', requestId: createRequestId(), query: { type: 'workflow_queue' } })
  }

  queryChairProjection(): void {
    this.send({ type: 'query', requestId: createRequestId(), query: { type: 'chair_projection' } })
  }

  execute(command: UserClientCommand, idempotencyKey = createRequestId()): string {
    const requestId = createRequestId()
    this.send({ type: 'execute', requestId, idempotencyKey, command })
    return requestId
  }

  disconnect(): void {
    this.closedExplicitly = true
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setStatus('disconnected')
  }

  private open(onOpen: () => void): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      onOpen()
      return
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      this.ws.addEventListener('open', onOpen, { once: true })
      return
    }

    this.setStatus('connecting')
    const ws = new WebSocket(getUserClientWsUrl())
    this.ws = ws
    ws.onopen = () => {
      if (this.ws !== ws) return
      this.setStatus('connected')
      onOpen()
    }
    ws.onmessage = (event) => this.handleMessage(event.data)
    ws.onerror = () => {
      // The close handler has the terminal state and avoids duplicate errors.
    }
    ws.onclose = () => {
      if (this.ws !== ws) return
      this.ws = null
      this.setStatus('disconnected')
      if (!this.closedExplicitly) this.callbacks.onSessionRevoked?.('host_shutdown')
    }
  }

  private send(message: HostClientMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.callbacks.onError?.({
        code: 'unauthenticated',
        message: '与 Host Service 的连接尚未建立'
      })
      return
    }
    this.ws.send(JSON.stringify(message))
  }

  private handleMessage(raw: unknown): void {
    let message: HostServerMessage
    try {
      message = JSON.parse(String(raw)) as HostServerMessage
    } catch {
      return
    }
    if (!isHostServerMessage(message)) return

    switch (message.type) {
      case 'auth_result':
        if (message.success && message.session) {
          this.callbacks.onAuthenticated?.(message.session)
        } else if (message.error) {
          this.callbacks.onAuthError?.(message.error)
        }
        break
      case 'projection':
        this.callbacks.onProjection?.(message.projection)
        break
      case 'workflow_queue':
        this.callbacks.onWorkflowQueue?.(message.projection)
        break
      case 'chair_projection':
        this.callbacks.onChairProjection?.(message.projection)
        break
      case 'content_changed':
        this.callbacks.onContentChanged?.(message.content)
        break
      case 'command_result':
        this.callbacks.onCommandResult?.(message.result)
        break
      case 'session_revoked':
        this.closedExplicitly = true
        this.callbacks.onSessionRevoked?.(message.reason)
        this.ws?.close()
        break
      case 'error':
        this.callbacks.onError?.(message.error)
        break
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return
    this.status = status
    this.callbacks.onConnectionStatus?.(status)
  }
}

export function getUserClient(): UserClient {
  currentClient ??= new UserClient()
  return currentClient
}

/** Test seam for a route-level client without exposing a Chair-side bridge. */
export function setUserClient(client: UserClient | null): void {
  currentClient?.disconnect()
  currentClient = client
}
