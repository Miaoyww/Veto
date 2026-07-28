/**
 * plugin-server.ts — Plugin WebSocket + HTTP 服务器
 *
 * 为 Service 插件提供两个通信通道：
 * - WebSocket (ws://127.0.0.1:{port}/plugin): 事件推送（subscribe/unsubscribe/event）
 * - HTTP REST (http://127.0.0.1:{port}/api/*): 数据查询
 *
 * 从 EventBus 接收渲染进程发出的事件，广播给所有匹配订阅的插件客户端。
 */

import * as http from 'http'
import type { Duplex } from 'stream'
import { loadStore } from '../veto-store'
import { createLogger } from '../logger'

const log = createLogger('PluginServer')
import {
  encodeFrame,
  encodePingFrame,
  encodeCloseFrame,
  decodeFrame,
  peekFrameLength,
  sendHandshake,
} from '../ws-utils'
import type { ServiceEventPayload, ServiceEventType } from '../types/service-plugin'

// ── 常量 ────────────────────────────────────────────────────────────────────

const DEFAULT_PORT = 19528
const MAX_PORT_RETRY = 99
const HEARTBEAT_INTERVAL = 5000
const HEARTBEAT_TIMEOUT = 10000

// ── 类型 ────────────────────────────────────────────────────────────────────

interface PluginWsClient {
  socket: Duplex
  subscriptions: Set<string>
  connectedAt: number
  lastPong: number
}

interface PluginServerMessage {
  type: string
  events?: string[]
  requestId?: string
  data?: Record<string, unknown>
}

// ── PluginServer ────────────────────────────────────────────────────────────

export class PluginServer {
  private httpServer: http.Server
  private clients = new Set<PluginWsClient>()
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private port = 0
  private startedAt = 0

  constructor() {
    this.httpServer = http.createServer((req, res) => {
      this.handleHttpRequest(req, res)
    })

    this.httpServer.on('upgrade', (req, socket, head) => {
      this.handleUpgrade(req, socket as Duplex, head)
    })
  }

  // ── 服务器生命周期 ────────────────────────────────────────────────────

  /** 启动服务器，返回实际监听端口 */
  async start(): Promise<number> {
    this.startedAt = Date.now()
    this.port = await this.listen(DEFAULT_PORT)
    this.startHeartbeat()
    log.info(`Listening on http://127.0.0.1:${this.port} (WS + HTTP)`)
    return this.port
  }

  /** 停止服务器 */
  async stop(): Promise<void> {
    this.stopHeartbeat()

    // 通知所有客户端关闭
    for (const client of this.clients) {
      try {
        client.socket.write(encodeCloseFrame(1001))
      } catch {
        /* ignore */
      }
    }
    this.clients.clear()

    return new Promise((resolve) => {
      this.httpServer.close(() => resolve())
    })
  }

  /** 获取实际端口 */
  getPort(): number {
    return this.port
  }

  // ── 事件广播 ──────────────────────────────────────────────────────────

  /**
   * 从 EventBus 接收事件并广播到匹配的插件客户端。
   * 替换旧的 eventBus.onAny() 模式。
   */
  broadcastEvent(type: ServiceEventType | string, data: Record<string, unknown> = {}): void {
    const payload: ServiceEventPayload = {
      type: type as ServiceEventType,
      timestamp: Date.now(),
      data,
    }

    const message = encodeFrame(
      JSON.stringify({ type: 'event', data: payload })
    )

    for (const client of this.clients) {
      if (this.matchesAnySubscription(client, type)) {
        try {
          client.socket.write(message)
        } catch {
          this.clients.delete(client)
        }
      }
    }
  }

  // ── HTTP 请求处理 ─────────────────────────────────────────────────────

  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url ?? '/', `http://localhost:${this.port}`)
    const path = url.pathname

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Plugin-Id')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    try {
      // GET /health
      if (req.method === 'GET' && path === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            status: 'ok',
            uptime: Date.now() - this.startedAt,
            clients: this.clients.size,
          })
        )
        return
      }

      // GET /api/timelines
      if (req.method === 'GET' && path === '/api/timelines') {
        const data = this.queryTimelines()
        this.sendJson(res, 200, { success: true, data })
        return
      }

      // GET /api/conferences
      if (req.method === 'GET' && path === '/api/conferences') {
        const data = this.queryConferences()
        this.sendJson(res, 200, { success: true, data })
        return
      }

      // GET /api/conferences/:id/minutes
      const minutesMatch = path.match(/^\/api\/conferences\/([^/]+)\/minutes$/)
      if (req.method === 'GET' && minutesMatch) {
        const conferenceId = decodeURIComponent(minutesMatch[1])
        const limit = parseInt(url.searchParams.get('limit') ?? '10')
        const data = this.getConferenceMinutes(conferenceId, limit)
        this.sendJson(res, 200, { success: true, data })
        return
      }

      // GET /api/plugins/:pluginId/config
      const configGetMatch = path.match(/^\/api\/plugins\/([^/]+)\/config$/)
      if (req.method === 'GET' && configGetMatch) {
        const pluginId = decodeURIComponent(configGetMatch[1])
        const data = this.getPluginConfig(pluginId)
        this.sendJson(res, 200, { success: true, data })
        return
      }

      // POST /api/plugins/:pluginId/config
      if (req.method === 'POST' && configGetMatch) {
        const pluginId = decodeURIComponent(configGetMatch[1])
        let body = ''
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString()
        })
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body)
            this.savePluginConfig(pluginId, parsed)
            this.sendJson(res, 200, { success: true })
          } catch (err) {
            this.sendJson(res, 400, { success: false, error: 'Invalid JSON' })
          }
        })
        return
      }

      // 404
      this.sendJson(res, 404, { success: false, error: 'Not found' })
    } catch (err) {
      log.error('HTTP error:', err)
      this.sendJson(res, 500, { success: false, error: 'Internal server error' })
    }
  }

  // ── WebSocket 连接处理 ────────────────────────────────────────────────

  private handleUpgrade(req: http.IncomingMessage, socket: Duplex, _head: Buffer): void {
    // 只处理 /plugin 路径
    const url = new URL(req.url ?? '/', `http://localhost:${this.port}`)
    if (url.pathname !== '/plugin') {
      socket.destroy()
      return
    }

    const key = req.headers['sec-websocket-key']
    if (!key) {
      socket.destroy()
      return
    }

    sendHandshake(socket, key)

    const client: PluginWsClient = {
      socket,
      subscriptions: new Set(),
      connectedAt: Date.now(),
      lastPong: Date.now(),
    }
    this.clients.add(client)
    log.info(`Plugin connected (total: ${this.clients.size})`)

    // 发送 welcome 消息
    try {
      socket.write(
        encodeFrame(
          JSON.stringify({
            type: 'welcome',
            port: this.port,
            version: '0.1.0',
          })
        )
      )
    } catch {
      /* ignore */
    }

    let buffer = Buffer.alloc(0)

    socket.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk])

      // 尝试解析完整帧
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

        if (msg) {
          try {
            const parsed = JSON.parse(msg) as PluginServerMessage
            this.handleWsMessage(client, parsed)
          } catch {
            // ignore malformed JSON
          }
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

  private handleWsMessage(client: PluginWsClient, msg: PluginServerMessage): void {
    switch (msg.type) {
      case 'subscribe':
        if (msg.events) {
          for (const event of msg.events) {
            client.subscriptions.add(event)
          }
          // 发送 ack
          try {
            client.socket.write(
              encodeFrame(
                JSON.stringify({
                  type: 'ack',
                  requestType: 'subscribe',
                  events: msg.events,
                  requestId: msg.requestId,
                })
              )
            )
          } catch {
            /* ignore */
          }
        }
        break

      case 'unsubscribe':
        if (msg.events) {
          for (const event of msg.events) {
            client.subscriptions.delete(event)
          }
        }
        break

      case 'pong':
        client.lastPong = Date.now()
        break

      default:
        // 未知消息类型，静默忽略
        break
    }
  }

  private removeClient(client: PluginWsClient): void {
    this.clients.delete(client)
    try {
      client.socket.destroy()
    } catch {
      /* ignore */
    }
    log.info(`Plugin disconnected (total: ${this.clients.size})`)
  }

  // ── 心跳 ──────────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now()
      const pingFrame = encodePingFrame()

      for (const client of this.clients) {
        if (now - client.lastPong > HEARTBEAT_TIMEOUT) {
          this.removeClient(client)
          log.warn('Plugin heartbeat timeout')
          continue
        }
        try {
          client.socket.write(pingFrame)
        } catch {
          this.removeClient(client)
        }
      }
    }, HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // ── 端口分配 ──────────────────────────────────────────────────────────

  private listen(port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      let attemptPort = port

      const tryListen = (): void => {
        this.httpServer.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE' && attemptPort < port + MAX_PORT_RETRY) {
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

  // ── 事件匹配 ──────────────────────────────────────────────────────────

  private matchesAnySubscription(client: PluginWsClient, eventType: string): boolean {
    if (client.subscriptions.size === 0) return false
    for (const pattern of client.subscriptions) {
      if (matchPattern(pattern, eventType)) return true
    }
    return false
  }

  // ── 数据查询 ──────────────────────────────────────────────────────────

  private queryTimelines() {
    try {
      const data = loadStore<Array<Record<string, unknown>>>('tools')
      if (!data || !Array.isArray(data)) return []
      return data.map((raw) => {
        const state = (raw.state as Record<string, unknown>) ?? {}
        return {
          id: raw.id as string,
          name: raw.name as string,
          createdAt: raw.createdAt as number,
          paused: (state.paused as boolean) ?? true,
          ratio: (state.ratio as number) ?? 1,
          simTime: (state.simulationAnchor as number) ?? 0,
          realAnchor: (state.realAnchor as number) ?? 0,
        }
      })
    } catch (err) {
      log.error('Failed to query timelines:', err)
      return []
    }
  }

  private queryConferences() {
    try {
      const data = loadStore<Array<Record<string, unknown>>>('conferences')
      if (!data || !Array.isArray(data)) return []
      return data.map((raw) => ({
        id: raw.id as string,
        name: raw.name as string,
        venue: raw.venue as string | undefined,
        phase: (raw.phase as string) ?? 'preamble',
        presentCount: (raw.presentCount as number) ?? 0,
        votingCount: (raw.votingCount as number) ?? 0,
        currentSpeaker: raw.currentSpeaker
          ? {
              delegation: (raw.currentSpeaker as Record<string, unknown>).delegation as string,
              remaining: (raw.currentSpeaker as Record<string, unknown>).remaining as number,
            }
          : undefined,
        timelineId: raw.timelineId as string | null | undefined,
      }))
    } catch (err) {
      log.error('Failed to query conferences:', err)
      return []
    }
  }

  private getConferenceMinutes(conferenceId: string, limit = 10) {
    try {
      const data = loadStore<Array<Record<string, unknown>>>('conferences')
      if (!data || !Array.isArray(data)) return []
      const conf = data.find((c) => c.id === conferenceId)
      if (!conf) return []

      const minutes = (conf.minutes as Array<Record<string, unknown>>) ?? []
      return minutes
        .slice(-limit)
        .map((m) => ({
          id: m.id as string,
          timestamp: m.timestamp as number,
          // 向后兼容：新数据用 actionType，旧数据用 eventType
          type: ((m.actionType ?? m.eventType) as string) ?? 'info',
          title: (m.description as string)?.slice(0, 30) ?? '',
          detail: m.description as string | undefined,
        }))
        .reverse()
    } catch (err) {
      log.error('Failed to get minutes:', err)
      return []
    }
  }

  private getPluginConfig(pluginId: string): Record<string, unknown> {
    try {
      const { app } = require('electron')
      const path = require('path')
      const fs = require('fs')
      const configPath = path.join(app.getPath('userData'), 'Plugins', pluginId, 'config.json')
      if (!fs.existsSync(configPath)) return {}
      const raw = fs.readFileSync(configPath, 'utf-8')
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  private savePluginConfig(pluginId: string, data: Record<string, unknown>): void {
    try {
      const { app } = require('electron')
      const path = require('path')
      const fs = require('fs')
      const dir = path.join(app.getPath('userData'), 'Plugins', pluginId)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      const configPath = path.join(dir, 'config.json')
      fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (err) {
      log.error(`Failed to save config for ${pluginId}:`, err)
      throw err
    }
  }

  // ── HTTP 响应辅助 ─────────────────────────────────────────────────────

  private sendJson(res: http.ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }
}

// ── 事件模式匹配 ────────────────────────────────────────────────────────────

/**
 * 检查事件类型是否匹配模式。
 * 支持通配符 `*`：
 * - `'conference:*'` 匹配 `'conference:phase_changed'`
 * - `'*'` 匹配所有
 */
function matchPattern(pattern: string, eventType: string): boolean {
  if (pattern === eventType) return true
  if (pattern === '*') return true

  const regexStr =
    '^' +
    pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') +
    '$'
  try {
    return new RegExp(regexStr).test(eventType)
  } catch {
    return false
  }
}
