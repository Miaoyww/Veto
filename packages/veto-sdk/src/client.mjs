/**
 * @veto/sdk — client.mjs
 *
 * VetoClient 是 Service 插件与 Veto Core 通信的唯一入口。
 *
 * 使用方式：
 *   import { VetoClient } from '@veto/sdk'
 *
 *   const client = new VetoClient({ pluginId: 'veto.qq-bot' })
 *   await client.connect()
 *
 *   client.on('conference:phase_changed', (event) => { ... })
 *   const conferences = await client.queryConferences()
 */

import { WsTransport, QueryClient } from './transport.mjs'
import { matchEvent } from './utils.mjs'

export class VetoClient {
  /** @type {import('./types.d.ts').VetoClientOptions} */
  #opts
  /** @type {WsTransport} */
  #ws
  /** @type {QueryClient} */
  #query
  /** @type {Map<string, Set<import('./types.d.ts').EventHandler>>} */
  #handlers = new Map()
  /** @type {Array<{events: string[], handler: import('./types.d.ts').EventHandler}>} */
  #pendingSubscriptions = []
  /** @type {Function[]} */
  #cleanups = []

  /**
   * @param {import('./types.d.ts').VetoClientOptions} opts
   */
  constructor(opts = {}) {
    this.#opts = {
      port: opts.port ?? parseInt(process.env.VETO_WS_PORT ?? '19528'),
      host: opts.host ?? '127.0.0.1',
      autoConnect: opts.autoConnect ?? true,
      reconnect: opts.reconnect ?? true,
      reconnectInterval: opts.reconnectInterval ?? 3000,
      pluginId: opts.pluginId ?? process.env.VETO_PLUGIN_ID ?? '',
      pluginDir: opts.pluginDir ?? process.env.VETO_PLUGIN_DIR ?? '',
    }

    this.#ws = new WsTransport(this.#opts)
    this.#query = new QueryClient(this.#opts)

    // 监听来自服务器的 event 推送
    this.#cleanups.push(
      this.#ws.onMessage('event', (msg) => {
        // msg 已经是 transport 层从 event envelope 中解包出的 ServiceEventPayload
        // 格式: { type, timestamp, data }，无需再次解包
        this.#dispatch(msg)
      })
    )

    // 自动连接
    if (this.#opts.autoConnect) {
      this.connect().catch((err) => {
        console.error(`[VetoClient] Auto-connect failed: ${err.message}`)
      })
    }
  }

  // ── 生命周期 ──────────────────────────────────────────────────────────

  /** 连接到 PluginServer */
  async connect() {
    await this.#ws.connect()
    // 重放等待中的订阅
    await this.#replaySubscriptions()
  }

  /** 断开连接 */
  async disconnect() {
    for (const cleanup of this.#cleanups) {
      try { cleanup() } catch { /* ignore */ }
    }
    this.#cleanups = []
    this.#ws.disconnect()
  }

  /** 是否已连接 */
  get connected() {
    return this.#ws.connected
  }

  /** 获取运行状态 */
  getStatus() {
    return {
      connected: this.connected,
      subscribedEvents: Array.from(this.#handlers.keys()),
    }
  }

  // ── 事件订阅 ──────────────────────────────────────────────────────────

  /**
   * 订阅一个或多个事件类型。
   *
   * 支持通配符匹配：
   * - `'conference:phase_changed'` — 精确匹配
   * - `'conference:*'` — 匹配所有 conference: 前缀的事件
   * - `'conference:speaker_*'` — 模糊匹配
   * - `'*'` — 匹配所有事件
   *
   * @param {string | string[]} events - 事件类型或模式
   * @param {import('./types.d.ts').EventHandler} handler - 事件处理器
   * @returns {Function} 取消订阅
   */
  on(events, handler) {
    const eventList = Array.isArray(events) ? events : [events]

    for (const event of eventList) {
      if (!this.#handlers.has(event)) {
        this.#handlers.set(event, new Set())
      }
      this.#handlers.get(event).add(handler)
    }

    // 向服务器发送订阅
    this.#sendSubscribe(eventList)

    return () => {
      for (const event of eventList) {
        this.#handlers.get(event)?.delete(handler)
        if (this.#handlers.get(event)?.size === 0) {
          this.#handlers.delete(event)
        }
      }
      // 注意：不完全取消服务端订阅，因为可能有其他 handler 订阅同一事件
    }
  }

  /** @param {string[]} events */
  #sendSubscribe(events) {
    if (this.#ws.connected) {
      this.#ws.send({ type: 'subscribe', events })
    } else {
      // 暂存，等连接后重放
      // 找到或创建一个等待队列
    }
  }

  async #replaySubscriptions() {
    const allEvents = Array.from(this.#handlers.keys())
    if (allEvents.length > 0) {
      this.#ws.send({ type: 'subscribe', events: allEvents })
    }
  }

  /**
   * 分发事件到匹配的 handler。
   * @param {import('./types.d.ts').ServiceEventPayload} payload
   */
  #dispatch(payload) {
    for (const [pattern, handlers] of this.#handlers) {
      if (matchEvent(pattern, payload.type)) {
        for (const handler of handlers) {
          try {
            handler(payload)
          } catch (err) {
            console.error(`[VetoClient] Handler error for "${payload.type}":`, err)
          }
        }
      }
    }
  }

  // ── 数据查询 (HTTP) ───────────────────────────────────────────────────

  /** 查询所有时间线 */
  async queryTimelines() {
    return /** @type {import('./types.d.ts').TimelineSummary[]} */ (
      await this.#query.get('/api/timelines')
    )
  }

  /** 查询所有会议 */
  async queryConferences() {
    return /** @type {import('./types.d.ts').ConferenceSummary[]} */ (
      await this.#query.get('/api/conferences')
    )
  }

  /**
   * 查询指定会议的日志
   * @param {string} conferenceId
   * @param {number} [limit=10]
   */
  async getConferenceMinutes(conferenceId, limit = 10) {
    return /** @type {import('./types.d.ts').MinutesEntry[]} */ (
      await this.#query.get(`/api/conferences/${encodeURIComponent(conferenceId)}/minutes?limit=${limit}`)
    )
  }

  // ── 插件配置 (HTTP) ───────────────────────────────────────────────────

  /** 读取插件配置 */
  async getConfig() {
    return await this.#query.get(`/api/plugins/${encodeURIComponent(this.#opts.pluginId)}/config`)
  }

  /** 保存插件配置 */
  async saveConfig(data) {
    return await this.#query.post(`/api/plugins/${encodeURIComponent(this.#opts.pluginId)}/config`, data)
  }
}
