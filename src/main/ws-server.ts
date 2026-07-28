/**
 * ws-server.ts — 内建 WebSocket 服务器
 * ──────────────────────────────────────────
 * 在主进程中运行，不需要额外依赖。
 * 基于 Node.js http 协议。
 *
 * 提供 WsServer 类用于创建可定制的 WebSocket 服务器实例，
 * 以及 startWsServer() 便捷函数用于内建 Display 通信。
 *
 * 端口：从 19527 开始尝试，如遇冲突则递增寻找可用端口
 */

import * as http from 'http'
import type { Duplex } from 'stream'
import { createLogger } from './logger'
import {
  encodeFrame,
  encodePingFrame,
  encodePongFrame,
  decodeFrame,
  peekFrameLength,
  sendHandshake,
} from './ws-utils'

const log = createLogger('WS')

const DEFAULT_WS_PORT = 19527
const DEFAULT_MAX_RETRY = 99
const DEFAULT_HEARTBEAT_INTERVAL = 5_000
const DEFAULT_HEARTBEAT_TIMEOUT = 10_000

// ── 类型 ────────────────────────────────────────────────────────

export interface WsServerOptions {
  /** 起始端口，默认 19527 */
  port?: number
  /** 端口冲突时最大重试次数，默认 99 */
  maxRetry?: number
  /** 心跳间隔（毫秒），默认 5000 */
  heartbeatInterval?: number
  /** 心跳超时（毫秒），默认 10000 */
  heartbeatTimeout?: number
  /** WebSocket 升级路径前缀匹配。默认 '/'（匹配所有路径） */
  path?: string
}

export interface WsClient {
  socket: Duplex
  lastPong: number
  /** 附加的任意用户数据 */
  data?: any
}

// ── WsServer 类 ────────────────────────────────────────────────

export class WsServer {
  private httpServer: http.Server
  private clients = new Set<WsClient>()
  private opts: Required<WsServerOptions>
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private _port = 0

  // ── 回调（由使用方设置） ──────────────────────────────────

  /** 处理 HTTP 请求。返回 true 表示已处理，false 则回退到默认 426 响应 */
  onRequest?: (req: http.IncomingMessage, res: http.ServerResponse) => boolean
  /** 收到 WebSocket 文本消息 */
  onMessage?: (client: WsClient, message: string) => void
  /** WebSocket 客户端连接成功（握手完成后） */
  onConnect?: (client: WsClient, req: http.IncomingMessage) => void
  /** WebSocket 客户端断开 */
  onDisconnect?: (client: WsClient) => void

  constructor(options?: WsServerOptions) {
    this.opts = {
      port: options?.port ?? DEFAULT_WS_PORT,
      maxRetry: options?.maxRetry ?? DEFAULT_MAX_RETRY,
      heartbeatInterval: options?.heartbeatInterval ?? DEFAULT_HEARTBEAT_INTERVAL,
      heartbeatTimeout: options?.heartbeatTimeout ?? DEFAULT_HEARTBEAT_TIMEOUT,
      path: options?.path ?? '/',
    }

    this.httpServer = http.createServer((req, res) => {
      if (this.onRequest?.(req, res)) return
      // 默认：仅 WebSocket
      res.writeHead(426, { 'Content-Type': 'text/plain' })
      res.end('WebSocket only')
    })

    this.httpServer.on('upgrade', (req, socket, head) => {
      this.handleUpgrade(req, socket as Duplex, head)
    })
  }

  // ── 生命周期 ───────────────────────────────────────────────

  /** 启动服务器，返回实际监听端口 */
  async start(): Promise<number> {
    this._port = await this.listen(this.opts.port)
    this.startHeartbeat()
    log.info(`WebSocket server listening on ws://127.0.0.1:${this._port}`)
    return this._port
  }

  /** 停止服务器 */
  async stop(): Promise<void> {
    this.stopHeartbeat()
    for (const client of this.clients) {
      try { client.socket.destroy() } catch { /* ignore */ }
    }
    this.clients.clear()
    return new Promise((resolve) => {
      this.httpServer.close(() => resolve())
    })
  }

  /** 获取实际监听端口 */
  getPort(): number {
    return this._port
  }

  /** 获取当前连接的所有客户端（只读） */
  getClients(): ReadonlySet<WsClient> {
    return this.clients
  }

  // ── 消息发送 ───────────────────────────────────────────────

  /** 向所有客户端广播消息（JSON 自动序列化） */
  broadcast(data: unknown, filter?: (client: WsClient) => boolean): void {
    const payload = encodeFrame(JSON.stringify(data))
    for (const client of this.clients) {
      if (filter && !filter(client)) continue
      try { client.socket.write(payload) } catch { this.clients.delete(client) }
    }
  }

  /** 向单个客户端发送消息（JSON 自动序列化） */
  sendTo(client: WsClient, data: unknown): void {
    try {
      client.socket.write(encodeFrame(JSON.stringify(data)))
    } catch {
      this.clients.delete(client)
    }
  }

  /** 移除并销毁客户端连接 */
  removeClient(client: WsClient): void {
    this.clients.delete(client)
    try { client.socket.destroy() } catch { /* ignore */ }
    this.onDisconnect?.(client)
  }

  // ── WebSocket 升级处理 ─────────────────────────────────────

  private handleUpgrade(req: http.IncomingMessage, socket: Duplex, _head: Buffer): void {
    // 路径过滤
    const url = req.url ?? '/'
    const pathname = url.split('?')[0]
    if (!pathname.startsWith(this.opts.path)) {
      socket.destroy()
      return
    }

    const key = req.headers['sec-websocket-key']
    if (!key) {
      socket.destroy()
      return
    }

    sendHandshake(socket, key)

    const client: WsClient = { socket, lastPong: Date.now() }
    this.clients.add(client)
    log.info(`Client connected (total: ${this.clients.size})`)

    this.onConnect?.(client, req)

    let buffer = Buffer.alloc(0)

    socket.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk])

      while (buffer.length >= 2) {
        const peeked = peekFrameLength(buffer)
        if (!peeked) break

        const frameLen = peeked.headerLen + peeked.payloadLen
        if (buffer.length < frameLen) break

        const frame = buffer.subarray(0, frameLen)
        buffer = buffer.subarray(frameLen)

        const msg = decodeFrame(frame)

        if (msg === '__CLOSE__') {
          this.removeClient(client)
          return
        }

        if (msg === '__PONG__') {
          client.lastPong = Date.now()
          continue
        }

        if (msg === '__PING__') {
          // RFC 6455: 收到 Ping 必须回复 Pong
          try { client.socket.write(encodePongFrame(Buffer.alloc(0))) } catch { /* ignore */ }
          client.lastPong = Date.now()
          continue
        }

        if (msg) {
          this.onMessage?.(client, msg)
        }
      }
    })

    socket.on('close', () => {
      this.removeClient(client)
    })

    socket.on('error', () => {
      this.removeClient(client)
    })
  }

  // ── 心跳 ───────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now()
      const pingFrame = encodePingFrame()

      for (const client of this.clients) {
        if (now - client.lastPong > this.opts.heartbeatTimeout) {
          this.removeClient(client)
          log.warn('Client heartbeat timeout')
          continue
        }
        try { client.socket.write(pingFrame) } catch { this.removeClient(client) }
      }
    }, this.opts.heartbeatInterval)

    this.httpServer.on('close', () => {
      this.stopHeartbeat()
    })
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // ── 端口分配 ───────────────────────────────────────────────

  private listen(port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      let attemptPort = port

      const tryListen = (): void => {
        this.httpServer.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE' && attemptPort < port + this.opts.maxRetry) {
            attemptPort++
            tryListen()
          } else {
            reject(err)
          }
        })

        this.httpServer.listen(attemptPort, '127.0.0.1', () => {
          resolve(attemptPort)
        })
      }

      tryListen()
    })
  }
}

// ── 向后兼容：startWsServer ──────────────────────────────────

/**
 * 启动内建 WebSocket 服务器（Display 通信），返回监听端口。
 * 内部使用 WsServer 实例，保持原有行为不变。
 */
export function startWsServer(): Promise<number> {
  const server = new WsServer({ port: DEFAULT_WS_PORT })

  server.onMessage = (client, msg) => {
    try {
      const parsed = JSON.parse(msg)
      if (parsed.type === 'host') {
        client.data = { ...client.data, isHost: true }
        server.broadcast(parsed.data)
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return server.start()
}
