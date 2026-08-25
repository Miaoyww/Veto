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
import fs from 'fs'
import path from 'path'
import { WebSocketServer, WebSocket } from 'ws'
import { createLogger } from './logger'
import { randomBytes, timingSafeEqual, scryptSync } from 'crypto'
import { loadStore } from './data/store'
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

/** 用于 auth 解析的回调：根据 inviteCode 查找 Seat → 验证密码 */
export type AuthResolver = (
  inviteCode: string,
  password: string
) => Promise<{
  valid: boolean
  seatId?: string
  seatGroupId?: string
  conferenceId?: string
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
async function defaultAuthResolver(
  inviteCode: string,
  password: string
): Promise<{
  valid: boolean
  seatId?: string
  seatGroupId?: string
  conferenceId?: string
  error?: string
} | null> {
  try {
    const conferences = loadStore<Array<{
      id: string
      seats?: Array<{
        id: string
        inviteCode: string
        passwordHash: string
        passwordSalt?: string
        seatGroupId: string
      }>
    }>>('conferences')

    if (!conferences || !Array.isArray(conferences)) return null

    for (const conf of conferences) {
      if (!conf.seats) continue
      const seat = conf.seats.find(
        (s: { inviteCode: string }) => s.inviteCode === inviteCode
      )
      if (!seat) continue

      // 验证密码
      if (!seat.passwordHash) {
        // 未设置密码的席位：允许任何密码
        return {
          valid: true,
          seatId: seat.id,
          seatGroupId: seat.seatGroupId,
          conferenceId: conf.id
        }
      }

      const isValid = verifyPassword(
        password,
        seat.passwordHash,
        seat.passwordSalt ?? ''
      )

      if (isValid) {
        return {
          valid: true,
          seatId: seat.id,
          seatGroupId: seat.seatGroupId,
          conferenceId: conf.id
        }
      }

      return {
        valid: false,
        error: '密码错误'
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
      const server = createServer(handleRendererRequest)

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

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json'
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

function serveRendererFile(response: ServerResponse, requestPath: string): void {
  const rendererRoot = path.resolve(__dirname, '../renderer')
  const decodedPath = decodeURIComponent(requestPath)
  let filePath = path.normalize(path.join(rendererRoot, decodedPath))

  if (filePath === rendererRoot) {
    filePath = path.join(rendererRoot, 'index.html')
  }

  if (!filePath.startsWith(rendererRoot + path.sep)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Forbidden')
    return
  }

  let stat: fs.Stats | null = null
  try {
    stat = fs.statSync(filePath)
  } catch {
    // SPA fallback is required for /delegate/:id and /conference-display/:id.
    filePath = path.join(rendererRoot, 'index.html')
    stat = fs.statSync(filePath)
  }

  if (stat.isDirectory()) {
    filePath = path.join(filePath, 'index.html')
    stat = fs.statSync(filePath)
  }

  const ext = path.extname(filePath).toLowerCase()
  const isHtml = ext === '.html'
  response.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': isHtml ? 'no-store' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff'
  })
  fs.createReadStream(filePath).pipe(response)
}

function handleRendererRequest(
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

  serveRendererFile(response, requestPath)
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

  // Until seat credentials are implemented, remote clients are read-only.
  if (!client.isLocal) {
    sendError(ws, 'READ_ONLY', '当前会议仅允许主席端写入')
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
  const { inviteCode, password, clientType } = msg

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

  // Delegate: 验证邀请码+密码
  if (!inviteCode || !password) {
    sendError(ws, 'AUTH_REQUIRED', '需要邀请码和密码')
    return
  }

  const resolver = getAuthResolver()
  const result = await resolver(inviteCode, password)

  if (!result || !result.valid) {
    sendTo(ws, {
      type: 'auth_result',
      success: false,
      error: result?.error || '邀请码或密码错误'
    })
    return
  }

  client.clientType = 'delegate'
  client.seatId = result.seatId
  client.seatGroupId = result.seatGroupId
  client.conferenceId = result.conferenceId
  client.authenticated = true

  _clients.set(ws, client)

  sendTo(ws, {
    type: 'auth_result',
    success: true,
    clientType: 'delegate',
    seatId: result.seatId,
    seatGroupId: result.seatGroupId,
    conferenceId: result.conferenceId
  })

  log.info(
    `Delegate client authenticated: seat=${result.seatId}, seatGroup=${result.seatGroupId}, conf=${result.conferenceId}`
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
