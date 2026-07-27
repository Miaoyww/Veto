/**
 * @veto/sdk — transport.mjs
 *
 * WebSocket 连接管理 + HTTP fetch 封装。
 * 纯 ESM，零依赖，兼容 Node.js 18+。
 */

// ── WebSocket 连接 ──────────────────────────────────────────────────────────

/**
 * 管理与 PluginServer 的 WebSocket 连接。
 * 支持自动重连、心跳保持、请求/响应配对。
 */
export class WsTransport {
  /** @type {import('./types.d.ts').VetoClientOptions} */
  #opts
  /** @type {WebSocket | null} */
  #ws = null
  /** @type {number} */
  #reconnectTimer = null
  /** @type {number} */
  #reconnectAttempts = 0
  /** @type {Map<string, {resolve: Function, reject: Function, timer: number}>} */
  #pending = new Map()
  /** @type {Array<{type: string, handler: Function}>} */
  #listeners = []
  /** @type {number} */
  #requestIdCounter = 0

  /** @param {import('./types.d.ts').VetoClientOptions} opts */
  constructor(opts) {
    this.#opts = {
      port: opts.port ?? parseInt(process.env.VETO_WS_PORT ?? '19528'),
      host: opts.host ?? '127.0.0.1',
      reconnect: opts.reconnect ?? true,
      reconnectInterval: opts.reconnectInterval ?? 3000,
    }
  }

  /** 连接到 PluginServer */
  connect() {
    return new Promise((resolve, reject) => {
      const url = `ws://${this.#opts.host}:${this.#opts.port}/plugin`
      this.#log(`Connecting to ${url}…`)

      try {
        this.#ws = new WebSocket(url)
      } catch (err) {
        reject(err)
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error(`WebSocket connection timeout to ${url}`))
      }, 10_000)

      this.#ws.onopen = () => {
        clearTimeout(timeout)
        this.#reconnectAttempts = 0
        this.#log('Connected')
        resolve()
      }

      this.#ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(/** @type {string} */ (event.data))
          this.#handleMessage(msg)
        } catch {
          // ignore malformed JSON
        }
      }

      this.#ws.onclose = (event) => {
        this.#log(`Disconnected (code=${event.code})`)
        this.#ws = null
        this.#rejectAllPending(new Error('WebSocket disconnected'))
        this.#tryReconnect()
      }

      this.#ws.onerror = (err) => {
        clearTimeout(timeout)
        this.#log(`Connection error: ${err?.message ?? 'unknown'}`)
      }
    })
  }

  /** 断开连接 */
  disconnect() {
    this.#clearReconnect()
    this.#rejectAllPending(new Error('Client disconnected'))
    if (this.#ws) {
      this.#ws.close(1000, 'Client disconnect')
      this.#ws = null
    }
  }

  /** 是否已连接 */
  get connected() {
    return this.#ws?.readyState === WebSocket.OPEN
  }

  /**
   * 发送消息并等待响应（请求/响应模式）。
   * @param {object} msg - 消息体（不含 requestId，自动添加）
   * @param {number} [timeoutMs=15000]
   * @returns {Promise<object>}
   */
  request(msg, timeoutMs = 15_000) {
    return new Promise((resolve, reject) => {
      const requestId = `req-${++this.#requestIdCounter}`
      const payload = { ...msg, requestId }

      const timer = setTimeout(() => {
        this.#pending.delete(requestId)
        reject(new Error(`Request ${requestId} timed out (${msg.type})`))
      }, timeoutMs)

      this.#pending.set(requestId, { resolve, reject, timer })
      this.#send(payload)
    })
  }

  /**
   * 发送消息（不等待响应）。
   * @param {object} msg
   */
  send(msg) {
    this.#send(msg)
  }

  /**
   * 注册消息处理器。
   * @param {string} type - 消息类型
   * @param {Function} handler
   * @returns {Function} 取消注册
   */
  onMessage(type, handler) {
    const entry = { type, handler }
    this.#listeners.push(entry)
    return () => {
      const idx = this.#listeners.indexOf(entry)
      if (idx >= 0) this.#listeners.splice(idx, 1)
    }
  }

  // ── 内部方法 ──

  /** @param {object} msg */
  #send(msg) {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) {
      console.warn('[VetoSDK] Cannot send: not connected')
      return
    }
    this.#ws.send(JSON.stringify(msg))
  }

  /** @param {object} msg */
  #handleMessage(msg) {
    // 如果有 requestId，匹配 pending 请求
    if (msg.requestId && this.#pending.has(msg.requestId)) {
      const { resolve, reject, timer } = this.#pending.get(msg.requestId)
      this.#pending.delete(msg.requestId)
      clearTimeout(timer)

      if (msg.type === 'error' || msg.type === 'queryError' || msg.type === 'configError') {
        reject(new Error(msg.error ?? msg.message ?? 'Unknown error'))
      } else {
        resolve(msg)
      }
      return
    }

    // 事件推送
    if (msg.type === 'event') {
      for (const { type, handler } of this.#listeners) {
        if (type === 'event' || type === msg.eventType) {
          try {
            handler(msg.data ?? msg)
          } catch (err) {
            console.error(`[VetoSDK] Handler error for "${msg.eventType}":`, err)
          }
        }
      }
      return
    }

    // 心跳
    if (msg.type === 'ping') {
      this.#send({ type: 'pong' })
      return
    }

    // 广播到所有通用监听器
    for (const { type, handler } of this.#listeners) {
      if (type === '*') {
        try {
          handler(msg)
        } catch (err) {
          console.error('[VetoSDK] Handler error:', err)
        }
      }
    }
  }

  #tryReconnect() {
    if (!this.#opts.reconnect) return
    this.#clearReconnect()

    const delay = Math.min(
      this.#opts.reconnectInterval * Math.pow(1.5, this.#reconnectAttempts),
      30_000
    )
    this.#reconnectAttempts++

    this.#log(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.#reconnectAttempts})…`)
    this.#reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // 重连失败由 onclose → tryReconnect 处理
      })
    }, delay)
  }

  #clearReconnect() {
    if (this.#reconnectTimer != null) {
      clearTimeout(this.#reconnectTimer)
      this.#reconnectTimer = null
    }
  }

  /** @param {Error} err */
  #rejectAllPending(err) {
    for (const { reject, timer } of this.#pending.values()) {
      clearTimeout(timer)
      reject(err)
    }
    this.#pending.clear()
  }

  /** @param {string} msg */
  #log(msg) {
    if (process.env.VETO_SDK_DEBUG) {
      console.log(`[VetoSDK] ${msg}`)
    }
  }
}

// ── HTTP 查询客户端 ─────────────────────────────────────────────────────────

/**
 * HTTP fetch 封装，用于 PluginServer REST API。
 */
export class QueryClient {
  /** @type {string} */
  #baseUrl
  /** @type {string} */
  #pluginId

  /** @param {import('./types.d.ts').VetoClientOptions} opts */
  constructor(opts) {
    const port = opts.port ?? parseInt(process.env.VETO_HTTP_PORT ?? '19528')
    const host = opts.host ?? '127.0.0.1'
    this.#baseUrl = `http://${host}:${port}`
    this.#pluginId = opts.pluginId ?? ''
  }

  /**
   * GET 请求
   * @param {string} path
   * @returns {Promise<any>}
   */
  async get(path) {
    const res = await fetch(`${this.#baseUrl}${path}`, {
      method: 'GET',
      headers: this.#headers(),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`HTTP ${res.status}: ${body}`)
    }
    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error ?? 'Request failed')
    }
    return json.data
  }

  /**
   * POST 请求
   * @param {string} path
   * @param {object} body
   * @returns {Promise<any>}
   */
  async post(path, body) {
    const res = await fetch(`${this.#baseUrl}${path}`, {
      method: 'POST',
      headers: this.#headers(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text}`)
    }
    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error ?? 'Request failed')
    }
    return json.data
  }

  /** @returns {Record<string, string>} */
  #headers() {
    return {
      'Content-Type': 'application/json',
      'X-Plugin-Id': this.#pluginId,
    }
  }
}
