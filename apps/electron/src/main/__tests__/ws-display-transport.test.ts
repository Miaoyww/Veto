import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WebSocket from 'ws'
import type { Capability } from '../../../../shared/content-types'
import type { HostRuntimeRepository, HostRuntimeState } from '../host-runtime'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}))
vi.mock('../lan-service', () => ({ getAdvertisedConference: () => null }))

import { HostRuntime } from '../host-runtime'
import {
  getAuthenticatedClients,
  getDisplayWsPort,
  setHostRuntime,
  startDisplayWs,
  stopDisplayWs
} from '../ws-display'

class MemoryRepository implements HostRuntimeRepository {
  constructor(private state: HostRuntimeState) {}

  load(): HostRuntimeState {
    return structuredClone(this.state)
  }

  save(state: HostRuntimeState): void {
    this.state = structuredClone(state)
  }
}

function createRuntime(): HostRuntime {
  const committee = (
    id: string,
    name: string,
    capabilities: Capability[],
    seatId: string
  ): HostRuntimeState['conferences'][number]['committees'][number] => ({
    id,
    conferenceId: 'conference-1',
    name,
    type: id === 'mpc' ? ('mpc' as const) : ('cabinet' as const),
    defaultCapabilities: capabilities,
    seats: [
      {
        id: seatId,
        committeeId: id,
        name: `${seatId} seat`,
        capabilityOverrides: {}
      }
    ]
  })
  const runtime = new HostRuntime(
    new MemoryRepository({
      version: 1,
      conferences: [
        {
          id: 'conference-1',
          name: 'Conference One',
          committees: [
            committee('mpc', 'MPC', ['view_conference', 'submit_directive'], 'source-seat'),
            committee('cabinet', 'Cabinet', ['view_conference', 'process_directive'], 'target-seat')
          ],
          users: [],
          seatAccesses: [
            { seatId: 'source-seat', inviteCode: 'source-code' },
            { seatId: 'target-seat', inviteCode: 'target-code' }
          ],
          directives: [],
          news: [],
          situations: []
        }
      ],
      auditLog: [],
      idempotency: []
    })
  )
  expect(runtime.startConference('conference-1').ok).toBe(true)
  return runtime
}

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve())
    ws.once('error', reject)
  })
}

function waitForMessage(
  ws: WebSocket,
  predicate: (message: Record<string, unknown>) => boolean
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.off('message', onMessage)
      reject(new Error('Timed out waiting for WebSocket message'))
    }, 2_000)
    const onMessage = (data: WebSocket.RawData): void => {
      const message = JSON.parse(data.toString()) as Record<string, unknown>
      if (!predicate(message)) return
      clearTimeout(timeout)
      ws.off('message', onMessage)
      resolve(message)
    }
    ws.on('message', onMessage)
  })
}

async function connect(): Promise<WebSocket> {
  const ws = new WebSocket(`ws://127.0.0.1:${getDisplayWsPort()}`)
  await waitForOpen(ws)
  return ws
}

async function authenticate(
  ws: WebSocket,
  inviteCode = 'source-code'
): Promise<Record<string, unknown>> {
  const response = waitForMessage(ws, (message) => message.type === 'auth_result')
  ws.send(JSON.stringify({ type: 'auth', requestId: `auth-${inviteCode}`, inviteCode }))
  return response
}

describe('Host Service UserClient transport', () => {
  let runtime: HostRuntime

  beforeEach(async () => {
    runtime = createRuntime()
    await startDisplayWs(runtime)
  })

  afterEach(async () => {
    await stopDisplayWs()
    setHostRuntime(null)
  })

  it('rejects the legacy unauthed Display and Host message paths', async () => {
    const ws = await connect()
    const response = waitForMessage(ws, (message) => message.type === 'error')

    ws.send(JSON.stringify({ type: 'host', conference: { id: 'conference-1' } }))

    await expect(response).resolves.toMatchObject({
      type: 'error',
      error: { code: 'invalid_command' }
    })
    expect(getAuthenticatedClients()).toHaveLength(0)
  })

  it('authenticates a UserClient and routes typed queries through HostRuntime', async () => {
    const ws = await connect()
    const auth = await authenticate(ws)

    expect(auth).toMatchObject({
      type: 'auth_result',
      success: true,
      session: {
        conferenceId: 'conference-1',
        seatId: 'source-seat',
        identity: { committeeName: 'MPC' }
      }
    })
    expect(auth.session).not.toHaveProperty('inviteCode')
    expect(getAuthenticatedClients()).toHaveLength(1)

    const projection = waitForMessage(
      ws,
      (message) => message.type === 'projection' && message.requestId === 'projection-1'
    )
    ws.send(
      JSON.stringify({
        type: 'query',
        requestId: 'projection-1',
        query: { type: 'session_projection' }
      })
    )

    await expect(projection).resolves.toMatchObject({
      projection: {
        conferenceId: 'conference-1',
        identity: { seatId: 'source-seat' },
        filesAvailable: false
      }
    })
  })

  it('replaces an existing socket when the same Seat logs in again', async () => {
    const first = await connect()
    const firstAuth = await authenticate(first)
    const firstSession = (firstAuth.session as { sessionId: string }).sessionId

    const revoked = waitForMessage(first, (message) => message.type === 'session_revoked')
    const second = await connect()
    const secondAuth = await authenticate(second)

    await expect(revoked).resolves.toMatchObject({ type: 'session_revoked', reason: 'replaced' })
    const [connected] = getAuthenticatedClients()
    expect(connected).toMatchObject({
      seatId: 'source-seat',
      sessionId: (secondAuth.session as { sessionId: string }).sessionId
    })
    expect(connected.sessionId).not.toBe(firstSession)
  })

  it('passes UserClient commands through the single runtime execute path', async () => {
    const ws = await connect()
    await authenticate(ws)

    const result = waitForMessage(
      ws,
      (message) => message.type === 'command_result' && message.requestId === 'directive-1'
    )
    ws.send(
      JSON.stringify({
        type: 'execute',
        requestId: 'directive-1',
        idempotencyKey: 'directive-key-1',
        command: {
          type: 'submit_directive',
          title: 'Directive title',
          content: 'Directive content',
          targetCommitteeId: 'cabinet'
        }
      })
    )

    await expect(result).resolves.toMatchObject({
      result: {
        ok: true,
        requestId: 'directive-1',
        value: { targetCommitteeId: 'cabinet', status: 'submitted' }
      }
    })
  })
})
