/**
 * ws-display.ts — 通用 WebSocket 通信服务器
 *
 * 基于 `ws` 包实现。升级后支持三种客户端类型：
 * - Chair（主席端）：连接自己的 WS server，发送状态 + 接收代表消息
 * - Display（投屏端）：向后兼容，无 auth 即视为 display
 * - Delegate（代表端）：auth 认证后双向通信
 *
 * 端口从 19527 开始尝试，冲突时递增。
 * 消息路由替代广播：不同消息类型路由到不同客户端集合。
 */

import { createServer, IncomingMessage, Server, ServerResponse } from 'http'
import { BrowserWindow } from 'electron'
import { WebSocketServer, WebSocket } from 'ws'
import { createLogger } from './logger'
import { randomBytes, randomUUID, timingSafeEqual, scryptSync } from 'crypto'
import { loadStore, saveStore } from './data/store'
import { getAdvertisedConference } from './lan-service'

const log = createLogger('SessionWS')

const DEFAULT_PORT = 19527
const MAX_RETRY = 99

// ---- 密码工具 -----------------------------------------------------------

const SALT_LENGTH = 32 // bytes
const KEY_LENGTH = 64   // bytes

/** 使用 PBKDF2 风格的 hash（兼容 Node.js crypto，未来可迁移到 bcrypt/argon2） */
export function hashPassword(password: string, salt?: Buffer): { hash: string; salt: string } {
  const s = salt ?? randomBytes(SALT_LENGTH)
  const derivedKey = scryptSync(password, s, KEY_LENGTH)
  return {
    hash: derivedKey.toString('hex'),
    salt: s.toString('hex')
  }
}

/** 验证密码 */
export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  try {
    const salt = Buffer.from(storedSalt, 'hex')
    const { hash } = hashPassword(password, salt)
    const hashA = Buffer.from(hash, 'hex')
    const hashB = Buffer.from(storedHash, 'hex')
    if (hashA.length !== hashB.length) return false
    return timingSafeEqual(hashA, hashB)
  } catch {
    return false
  }
}

// ---- 类型定义 -----------------------------------------------------------

/** 已认证客户端信息 */
export interface AuthenticatedClient {
  ws: WebSocket
  clientType: 'display' | 'delegate' | 'chair'
  seatId?: string
  seatGroupId?: string
  conferenceId?: string
  authenticated: boolean
  isLocal: boolean
}

/** WS 消息协议 */
export interface WsMessage {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface StoredUser {
  id: string
  name: string
  passwordHash?: string
  passwordSalt?: string
}

interface StoredSeat {
  id: string
  name: string
  seatGroupId: string
  userId?: string
  role?: string
  procedure?: {
    shortName?: string
    flagUrl?: string
    attendance: 'present' | 'absent'
    hasVotingRights: boolean
    sortOrder: number
  }
  capabilityOverrides: Record<string, boolean | undefined>
}

interface StoredConference {
  id: string
  users: StoredUser[]
  seatAccesses: Array<{ seatId: string; inviteCode: string }>
  seatGroups: Array<{ id: string; defaultCapabilities: string[] }>
  committees: Array<{ seats: StoredSeat[] }>
}

interface AuthenticatedSeatSession {
  conferenceId: string
  seat: {
    id: string
    name: string
    role?: string
    procedure?: StoredSeat['procedure']
  }
  seatGroupId: string
  capabilities: string[]
  user: { id: string; name: string; hasPassword: boolean }
}

function notifyRenderers(event: string, data: Record<string, unknown>): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('veto:event', { event, data })
  }
}

/** 用于 auth 解析的回调：根据 inviteCode 认领席位或验证其 User。 */
export type AuthResolver = (
  inviteCode: string,
  name: string,
  password?: string
) => Promise<{
  valid: boolean
  session?: AuthenticatedSeatSession
  error?: string
} | null>

// ---- 服务器状态 ---------------------------------------------------------

let wss: WebSocketServer | null = null
let httpServer: Server | null = null
let lastHostMessage: WsMessage | null = null
let lastTimerMessage: WsMessage | null = null

/** 已认证的客户端映射 */
const _clients = new Map<WebSocket, AuthenticatedClient>()

/** 外部 auth 解析器（由 Chair 端设置） */
let _authResolver: AuthResolver | null = null

/**
 * 默认 auth 解析器：从文件存储加载会议数据，查找 Seat 并验证密码。
 * 当外部未设置 auth resolver 时使用。
 */
export async function defaultAuthResolver(
  inviteCode: string,
  name: string,
  password?: string
): Promise<{
  valid: boolean
  session?: AuthenticatedSeatSession
  error?: string
} | null> {
  try {
    const conferences = loadStore<StoredConference[]>('conferences')

    if (!conferences || !Array.isArray(conferences)) return null

    for (const conf of conferences) {
      const access = conf.seatAccesses.find((item) => item.inviteCode === inviteCode)
      if (!access) continue
      const seat = conf.committees.flatMap((committee) => committee.seats)
        .find((item) => item.id === access.seatId)
      if (!seat) continue

      let user: StoredUser
      if (seat.userId) {
        const assignedUser = conf.users.find((item) => item.id === seat.userId)
        if (!assignedUser) return { valid: false, error: '席位使用者数据无效，请联系主席重置' }
        user = assignedUser
      } else {
        const userName = name.trim()
        if (!userName) return { valid: false, error: '首次连接需要填写姓名' }
        const passwordData = password ? hashPassword(password) : undefined
        user = {
          id: randomUUID(),
          name: userName,
          passwordHash: passwordData?.hash,
          passwordSalt: passwordData?.salt
        }
        conf.users.push(user)
        seat.userId = user.id
        saveStore('conferences', conferences)
        notifyRenderers('conference:user-claimed', {
          conferenceId: conf.id,
          seatId: seat.id,
          user
        })
      }
      if (
        user.passwordHash &&
        (!password || !verifyPassword(password, user.passwordHash, user.passwordSalt ?? ''))
      ) {
        return { valid: false, error: '密码错误' }
      }

      const group = conf.seatGroups.find((item) => item.id === seat.seatGroupId)
      const capabilities = new Set(group?.defaultCapabilities ?? [])
      for (const [capability, enabled] of Object.entries(seat.capabilityOverrides ?? {})) {
        if (enabled) capabilities.add(capability)
        else capabilities.delete(capability)
      }
      return {
        valid: true,
        session: {
          conferenceId: conf.id,
          seat: {
            id: seat.id,
            name: seat.name,
            role: seat.role,
            procedure: seat.procedure ? { ...seat.procedure } : undefined
          },
          seatGroupId: seat.seatGroupId,
          capabilities: [...capabilities],
          user: { id: user.id, name: user.name, hasPassword: Boolean(user.passwordHash) }
        }
      }
    }

    return {
      valid: false,
      error: '邀请码无效'
    }
  } catch (err) {
    log.error('Auth resolver error:', err)
    return {
      valid: false,
      error: '认证服务错误'
    }
  }
}

/** 设置 auth 解析器（Chair 端在启动 WS 客户端后调用） */
export function setAuthResolver(resolver: AuthResolver | null): void {
  _authResolver = resolver
}

/** 获取当前 auth 解析器（回退到默认实现） */
function getAuthResolver(): AuthResolver {
  return _authResolver ?? defaultAuthResolver
}

/** 获取所有已认证客户端 */
export function getAuthenticatedClients(): AuthenticatedClient[] {
  return Array.from(_clients.values())
}

/** 按类型获取客户端 */
export function getClientsByType(type: string): AuthenticatedClient[] {
  return Array.from(_clients.values()).filter((c) => c.clientType === type)
}

/**
 * 启动通用 Session WebSocket 服务器。
 * @returns 实际监听端口
 */
export function startDisplayWs(): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryListen = (port: number): void => {
      const server = createServer(handleLanHttpRequest)

      wss = new WebSocketServer({ noServer: true })

      server.on('upgrade', (request, socket, head) => {
        if (!wss) {
          socket.destroy()
          return
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          server.emit('veto:connection', ws, request)
        })
      })

      server.on('listening', () => {
        httpServer = server
        log.info(`Veto LAN server listening on http://0.0.0.0:${port}`)
        setupConnectionHandler(server)
        resolve(port)
      })

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && port < DEFAULT_PORT + MAX_RETRY) {
          wss?.close()
          server.close()
          tryListen(port + 1)
        } else {
          reject(err)
        }
      })

      server.listen(port, '0.0.0.0')
    }

    tryListen(DEFAULT_PORT)
  })
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  })
  response.end(payload)
}

function handleLanHttpRequest(
  request: IncomingMessage,
  response: ServerResponse
): void {
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

/** 设置连接处理 */
function setupConnectionHandler(server: Server): void {
  server.on('veto:connection', (ws: WebSocket, request: IncomingMessage) => {
    log.info(`Client connected (total: ${wss?.clients.size ?? 0})`)

    // Unauthenticated connections are read-only display clients.
    const client: AuthenticatedClient = {
      ws,
      clientType: 'display', // 默认 display（向后兼容）
      authenticated: false,
      isLocal: isLoopbackAddress(request.socket.remoteAddress)
    }

    if (lastHostMessage) sendTo(ws, lastHostMessage)
    if (lastTimerMessage) sendTo(ws, lastTimerMessage)

    ws.on('message', async (data: Buffer) => {
      let parsed: WsMessage
      try {
        parsed = JSON.parse(data.toString())
      } catch {
        // 非 JSON 消息静默丢弃
        return
      }

      await handleMessage(ws, client, parsed)
    })

    ws.on('close', () => {
      _clients.delete(ws)
      log.info(`Client disconnected (total: ${wss?.clients.size ?? 0})`)
    })

    ws.on('error', (err) => {
      log.warn(`Client connection error: ${err.message}`)
    })
  })
}

function isLoopbackAddress(address: string | undefined): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

/** 消息路由 */
async function handleMessage(
  ws: WebSocket,
  client: AuthenticatedClient,
  msg: WsMessage
): Promise<void> {
  // ── auth 消息（所有认证类型统一处理）──
  if (msg.type === 'auth') {
    await handleAuth(ws, client, msg)
    return
  }

  // ── 向后兼容：host 类型 → 广播给所有 Display + Delegate ──
  if (msg.type === 'host') {
    if (!client.isLocal) {
      sendError(ws, 'FORBIDDEN', '仅本机主席端可以推送会议画面')
      return
    }
    ;(ws as any).__isHost = true
    if (!client.authenticated) {
      // 未认证 host 自动视为 display
      client.clientType = 'display'
      client.authenticated = true
    }
    lastHostMessage = msg
    broadcastToType(msg, ['display', 'delegate'])
    return
  }

  // ── timer_tick → 所有已认证客户端（Display + Delegate + Chair）──
  if (msg.type === 'timer_tick') {
    if (!client.isLocal) {
      sendError(ws, 'FORBIDDEN', '仅本机主席端可以推送计时状态')
      return
    }
    lastTimerMessage = msg
    broadcast(msg)
    return
  }

  // ── 未认证客户端只能发 auth ──
  if (!client.authenticated) {
    sendError(ws, 'UNAUTHORIZED', '请先认证')
    return
  }

  // ── 消息路由 ──
  switch (msg.type) {
    // Chair → Delegate/Display: 会议状态全量同步
    case 'conference_sync':
      broadcastToType(msg, ['delegate', 'display'])
      break

    // Delegate → Chair: 指令操作
    case 'directive:create':
    case 'directive:update':
    case 'directive:withdraw':
      routeToChair(msg)
      break

    // Delegate → Chair: 新闻操作
    case 'news:create':
    case 'news:update':
    case 'news:submit':
    case 'news:retract':
      routeToChair(msg)
      break

    // Chair → Delegate: 指令状态更新
    case 'directive:updated':
    case 'directive:status_changed':
      routeToSeatGroup(msg)
      break

    // Chair → Delegate: 新闻状态更新
    case 'news:updated':
    case 'news:published':
    case 'news:retracted':
      broadcastToType(msg, ['delegate'])
      break

    // Chair → Delegate: 局势更新
    case 'situation:created':
    case 'situation:updated':
      broadcastToType(msg, ['delegate'])
      break

    // Chair → Delegate: 模式切换
    case 'mode_change':
      routeToSeatGroup(msg)
      break

    // 未知类型广播（向后兼容）
    default:
      broadcast(msg)
      break
  }
}

/** 处理 auth 消息 */
async function handleAuth(
  ws: WebSocket,
  client: AuthenticatedClient,
  msg: WsMessage
): Promise<void> {
  const { inviteCode, name, password, clientType } = msg

  // Chair 端自助认证（不需要 inviteCode）
  if (clientType === 'chair') {
    if (!client.isLocal) {
      sendTo(ws, {
        type: 'auth_result',
        success: false,
        error: '主席端仅允许本机连接'
      })
      return
    }
    client.clientType = 'chair'
    client.authenticated = true
    _clients.set(ws, client)
    sendTo(ws, { type: 'auth_result', success: true, clientType: 'chair' })
    log.info('Chair client authenticated')
    return
  }

  // Display 兼容路径：无 auth 视为 display（连接后不发 auth 消息即为 display）
  if (!inviteCode && !password) {
    client.clientType = msg.clientType || 'display'
    client.authenticated = true
    _clients.set(ws, client)
    sendTo(ws, { type: 'auth_result', success: true, clientType: client.clientType })
    log.info(`Display client authenticated (no auth)`)
    return
  }

  // Delegate: 邀请码定位席位，首次连接时创建 User。
  if (!inviteCode || typeof name !== 'string' || !name.trim()) {
    sendError(ws, 'AUTH_REQUIRED', '需要邀请码和姓名')
    return
  }

  const resolver = getAuthResolver()
  const result = await resolver(inviteCode, name, typeof password === 'string' ? password : undefined)

  if (!result?.valid || !result.session) {
    sendTo(ws, {
      type: 'auth_result',
      success: false,
      error: result?.error || '邀请码或密码错误'
    })
    return
  }

  client.clientType = 'delegate'
  client.seatId = result.session.seat.id
  client.seatGroupId = result.session.seatGroupId
  client.conferenceId = result.session.conferenceId
  client.authenticated = true

  _clients.set(ws, client)

  sendTo(ws, {
    type: 'auth_result',
    success: true,
    clientType: 'delegate',
    session: result.session
  })

  log.info(
    `Delegate client authenticated: seat=${client.seatId}, seatGroup=${client.seatGroupId}, conf=${client.conferenceId}`
  )
}

// ---- 发送辅助函数 -------------------------------------------------------

function sendTo(ws: WebSocket, msg: WsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

function sendError(ws: WebSocket, code: string, message: string): void {
  sendTo(ws, { type: 'delegate_error', code, message })
}

/** 广播给所有已认证客户端 */
function broadcast(msg: WsMessage): void {
  const payload = JSON.stringify(msg)
  for (const client of _clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload)
    }
  }
  // 也广播给未认证的 WebSocket 连接（向后兼容旧的 Display 连接）
  if (wss) {
    for (const ws of wss.clients) {
      if (!_clients.has(ws) && ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    }
  }
}

/** 广播给指定类型的客户端 */
function broadcastToType(msg: WsMessage, clientTypes: string[]): void {
  const payload = JSON.stringify(msg)
  for (const client of _clients.values()) {
    if (clientTypes.includes(client.clientType) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload)
    }
  }
  // 向后兼容：未注册的 display 连接
  if (clientTypes.includes('display') && wss) {
    for (const ws of wss.clients) {
      if (!_clients.has(ws) && ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    }
  }
}

/** 路由到 Chair 连接 */
function routeToChair(msg: WsMessage): void {
  const payload = JSON.stringify(msg)
  for (const client of _clients.values()) {
    if (client.clientType === 'chair' && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload)
    }
  }
}

/** 路由到指定 SeatGroup 的所有 Delegate */
function routeToSeatGroup(msg: WsMessage): void {
  const payload = JSON.stringify(msg)
  const targetGroupId = msg.seatGroupId
  for (const client of _clients.values()) {
    if (
      client.clientType === 'delegate' &&
      client.ws.readyState === WebSocket.OPEN &&
      (!targetGroupId || client.seatGroupId === targetGroupId)
    ) {
      client.ws.send(payload)
    }
  }
  // 无 seatGroupId 时广播给所有 delegate
  if (!targetGroupId) {
    for (const client of _clients.values()) {
      if (client.clientType === 'delegate' && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload)
      }
    }
  }
}

/** 停止 Session WebSocket 服务器 */
export function stopDisplayWs(): Promise<void> {
  return new Promise((resolve) => {
    _clients.clear()
    lastHostMessage = null
    lastTimerMessage = null
    for (const client of wss?.clients ?? []) {
      client.terminate()
    }

    const closeHttp = (done: () => void): void => {
      if (!httpServer) {
        done()
        return
      }
      httpServer.close(() => done())
      httpServer = null
    }

    if (!wss) {
      closeHttp(() => resolve())
      return
    }

    wss.close(() => {
      wss = null
      closeHttp(() => resolve())
    })
  })
}

/** 获取 Session WS 端口 */
export function getDisplayWsPort(): number {
  return (httpServer?.address() as { port: number } | null)?.port ?? 0
}
