/**
 * plugin-server.ts — Plugin WebSocket + HTTP 服务器
 *
 * 为 Service 插件提供两个通信通道：
 * - WebSocket (ws://127.0.0.1:{port}/plugin): 事件推送（subscribe/unsubscribe/event）
 * - HTTP REST (http://127.0.0.1:{port}/api/*): 数据查询
 *
 * 基于 WsServer 创建实例，添加 Plugin 专用的 HTTP 路由和 WebSocket 消息处理。
 * 从 EventBus 接收渲染进程发出的事件，广播给所有匹配订阅的插件客户端。
 */

import type { IncomingMessage, ServerResponse } from 'http'
import { loadStore } from '../veto-store'
import { createLogger } from '../logger'
import { WsServer, type WsClient } from '../ws-server'
import type { ServiceEventPayload, ServiceEventType } from '../types/service-plugin'

const log = createLogger('PluginServer')

// ── 常量 ──────────────────────────────────────────────────────

const DEFAULT_PORT = 19528

// ── 类型 ──────────────────────────────────────────────────────

interface PluginClientData {
  subscriptions: Set<string>
  connectedAt: number
}

type PluginWsClient = WsClient & { data: PluginClientData }

interface PluginServerMessage {
  type: string
  events?: string[]
  requestId?: string
  data?: Record<string, unknown>
}

// ── PluginServer ──────────────────────────────────────────────

export class PluginServer {
  private wsServer: WsServer
  private startedAt = 0

  constructor() {
    this.wsServer = new WsServer({ port: DEFAULT_PORT, path: '/plugin' })

    // ── HTTP 请求处理 ──────────────────────────────────────
    this.wsServer.onRequest = (req, res) => {
      return this.handleHttpRequest(req, res)
    }

    // ── WebSocket 连接 ─────────────────────────────────────
    this.wsServer.onConnect = (client, _req) => {
      const pluginClient = client as PluginWsClient
      pluginClient.data = {
        subscriptions: new Set(),
        connectedAt: Date.now(),
      }
      log.info(`Plugin connected (total: ${this.wsServer.getClients().size})`)

      // 发送 welcome 消息
      this.wsServer.sendTo(client, {
        type: 'welcome',
        port: this.wsServer.getPort(),
        version: '0.1.0',
      })
    }

    // ── WebSocket 断开 ─────────────────────────────────────
    this.wsServer.onDisconnect = (_client) => {
      log.info(`Plugin disconnected (total: ${this.wsServer.getClients().size})`)
    }

    // ── WebSocket 消息处理 ─────────────────────────────────
    this.wsServer.onMessage = (client, msg) => {
      try {
        const parsed = JSON.parse(msg) as PluginServerMessage
        this.handleWsMessage(client as PluginWsClient, parsed)
      } catch {
        // ignore malformed JSON
      }
    }
  }

  // ── 服务器生命周期 ──────────────────────────────────────────

  /** 启动服务器，返回实际监听端口 */
  async start(): Promise<number> {
    this.startedAt = Date.now()
    const port = await this.wsServer.start()
    log.info(`Listening on http://127.0.0.1:${port} (WS + HTTP)`)
    return port
  }

  /** 停止服务器 */
  async stop(): Promise<void> {
    await this.wsServer.stop()
  }

  /** 获取实际端口 */
  getPort(): number {
    return this.wsServer.getPort()
  }

  // ── 事件广播 ────────────────────────────────────────────────

  /**
   * 从 EventBus 接收事件并广播到匹配的插件客户端。
   */
  broadcastEvent(type: ServiceEventType | string, data: Record<string, unknown> = {}): void {
    const payload: ServiceEventPayload = {
      type: type as ServiceEventType,
      timestamp: Date.now(),
      data,
    }

    this.wsServer.broadcast(
      { type: 'event', data: payload },
      (client) => this.matchesAnySubscription(client as PluginWsClient, type)
    )
  }

  // ── HTTP 请求处理 ───────────────────────────────────────────

  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): boolean {
    const url = new URL(req.url ?? '/', `http://localhost:${this.getPort()}`)
    const path = url.pathname

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Plugin-Id')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return true
    }

    try {
      // GET /health
      if (req.method === 'GET' && path === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            status: 'ok',
            uptime: Date.now() - this.startedAt,
            clients: this.wsServer.getClients().size,
          })
        )
        return true
      }

      // GET /api/timelines
      if (req.method === 'GET' && path === '/api/timelines') {
        const data = this.queryTimelines()
        this.sendJson(res, 200, { success: true, data })
        return true
      }

      // GET /api/conferences
      if (req.method === 'GET' && path === '/api/conferences') {
        const data = this.queryConferences()
        this.sendJson(res, 200, { success: true, data })
        return true
      }

      // GET /api/conferences/:id/minutes
      const minutesMatch = path.match(/^\/api\/conferences\/([^/]+)\/minutes$/)
      if (req.method === 'GET' && minutesMatch) {
        const conferenceId = decodeURIComponent(minutesMatch[1])
        const limit = parseInt(url.searchParams.get('limit') ?? '10')
        const data = this.getConferenceMinutes(conferenceId, limit)
        this.sendJson(res, 200, { success: true, data })
        return true
      }

      // GET /api/plugins/:pluginId/config
      const configGetMatch = path.match(/^\/api\/plugins\/([^/]+)\/config$/)
      if (req.method === 'GET' && configGetMatch) {
        const pluginId = decodeURIComponent(configGetMatch[1])
        const data = this.getPluginConfig(pluginId)
        this.sendJson(res, 200, { success: true, data })
        return true
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
        return true
      }

      // 404
      this.sendJson(res, 404, { success: false, error: 'Not found' })
    } catch (err) {
      log.error('HTTP error:', err)
      this.sendJson(res, 500, { success: false, error: 'Internal server error' })
    }

    return true
  }

  // ── WebSocket 消息处理 ──────────────────────────────────────

  private handleWsMessage(client: PluginWsClient, msg: PluginServerMessage): void {
    switch (msg.type) {
      case 'subscribe':
        if (msg.events) {
          for (const event of msg.events) {
            client.data.subscriptions.add(event)
          }
          // 发送 ack
          this.wsServer.sendTo(client, {
            type: 'ack',
            requestType: 'subscribe',
            events: msg.events,
            requestId: msg.requestId,
          })
        }
        break

      case 'unsubscribe':
        if (msg.events) {
          for (const event of msg.events) {
            client.data.subscriptions.delete(event)
          }
        }
        break

      case 'pong':
        // lastPong 由 WsServer 的心跳机制自动更新（opcode 0xA → __PONG__），
        // 这里的 'pong' 文本消息是兼容旧协议，无需额外处理
        break

      default:
        // 未知消息类型，静默忽略
        break
    }
  }

  // ── 事件匹配 ────────────────────────────────────────────────

  private matchesAnySubscription(client: PluginWsClient, eventType: string): boolean {
    if (client.data.subscriptions.size === 0) return false
    for (const pattern of client.data.subscriptions) {
      if (matchPattern(pattern, eventType)) return true
    }
    return false
  }

  // ── 数据查询 ────────────────────────────────────────────────

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

  // ── HTTP 响应辅助 ───────────────────────────────────────────

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }
}

// ── 事件模式匹配 ──────────────────────────────────────────────────

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
