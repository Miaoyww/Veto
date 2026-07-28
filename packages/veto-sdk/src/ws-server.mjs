/**
 * ws-server.mjs — 可复用的 WebSocket 服务器（基于 ws 库）
 *
 * 为 Service 插件提供开箱即用的 WebSocket 服务器能力。
 * 基于 ws 库实现，由 ws 处理帧编解码、HTTP upgrade、心跳等底层细节。
 *
 * 使用:
 *   import { WsServer } from '@veto/sdk'
 *   const server = new WsServer({ port: 19529 })
 *   server.onConnection(client => { ... })
 *   server.onMessage((client, msg) => { ... })
 *   await server.start()
 */

import { WebSocketServer, WebSocket } from 'ws'
import * as http from 'node:http'
// ═══════════════════════════════════════════════════════════════════════════════
// 常量
// ═══════════════════════════════════════════════════════════════════════════════

/** 默认端口 */
const DEFAULT_PORT = 19529
/** 默认主机 */
const DEFAULT_HOST = '127.0.0.1'
/** 心跳间隔（毫秒） */
const DEFAULT_HEARTBEAT = 5000
/** 最大端口重试次数 */
const DEFAULT_MAX_PORT_RETRY = 99
/** 最大 payload 字节数（1 MB） */
const DEFAULT_MAX_PAYLOAD_SIZE = 1048576

/** WebSocket 正常关闭码 */
const CLOSE_NORMAL = 1000
/** WebSocket 服务端主动关闭码 */
const CLOSE_GOING_AWAY = 1001

// ═══════════════════════════════════════════════════════════════════════════════
// WsClient — 表示一个已连接的 WebSocket 客户端
// ═══════════════════════════════════════════════════════════════════════════════

let _clientIdCounter = 0

export class WsClient {
  /** @type {string} */ id
  /** @type {number} */ connectedAt
  /** @type {number} */ lastPong
  /** @type {any} */ data

  /** @type {import('ws').WebSocket} */
  #ws
  /** @type {import('./ws-server.mjs').WsServer} */
  #server
  /** @type {boolean} */
  #closed = false

  /**
   * @param {string} id
   * @param {import('ws').WebSocket} ws
   * @param {import('./ws-server.mjs').WsServer} server
   */
  constructor(id, ws, server) {
    this.id = id
    this.#ws = ws
    this.#server = server
    this.connectedAt = Date.now()
    this.lastPong = Date.now()
    this.data = undefined
  }

  /**
   * 向客户端发送 JSON 消息。
   * @param {any} data - 可 JSON 序列化的数据
   */
  send(data) {
    if (this.#closed || this.#ws.readyState !== WebSocket.OPEN) return
    try {
      this.#ws.send(JSON.stringify(data))
    } catch {
      this.#closed = true
      this.#server._removeClient(this)
    }
  }

  /**
   * 关闭连接。
   * @param {number} [code=1000] - WebSocket 关闭码
   */
  close(code = CLOSE_NORMAL) {
    if (this.#closed) return
    this.#closed = true
    try {
      this.#ws.close(code)
    } catch {
      /* ignore */
    }
    this.#server._removeClient(this)
  }

  /** @internal 更新心跳时间戳 */
  _touch() {
    this.lastPong = Date.now()
  }

  /** @internal 获取底层 WebSocket 实例 */
  _getWs() {
    return this.#ws
  }

  /** 是否已关闭 */
  get closed() {
    return this.#closed
  }

  /** @internal 标记为已关闭 */
  _markClosed() {
    this.#closed = true
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WsServer — WebSocket 服务器
// ═══════════════════════════════════════════════════════════════════════════════

export class WsServer {
  /** @type {number} */ #port = 0
  /** @type {string} */ #host
  /** @type {string} */ #path
  /** @type {number} */ #heartbeat
  /** @type {number} */ #heartbeatTimeout
  /** @type {number} */ #maxPortRetry
  /** @type {number} */ #maxPayloadSize

  /** @type {http.Server | null} */
  #httpServer = null
  /** @type {WebSocketServer | null} */
  #wss = null
  /** @type {ReturnType<typeof setInterval> | null} */
  #heartbeatTimer = null
  /** @type {Set<WsClient>} */
  #clients = new Set()
  /** @type {boolean} */
  #stopping = false

  /** @type {Array<{method: string, path: string, handler: Function}>} */
  #routes = []
  /** @type {Array<Function>} */
  #connectionCallbacks = []
  /** @type {Array<Function>} */
  #messageCallbacks = []
  /** @type {Array<Function>} */
  #closeCallbacks = []

  /**
   * @param {object} [options]
   * @param {number} [options.port=19529]
   * @param {string} [options.host='127.0.0.1']
   * @param {string} [options.path='/']
   * @param {number} [options.heartbeat=5000]
   * @param {number} [options.heartbeatTimeout]
   * @param {number} [options.maxPortRetry=99]
   * @param {number} [options.maxPayloadSize=1048576]
   */
  constructor(options = {}) {
    this.#host = options.host ?? DEFAULT_HOST
    this.#path = options.path ?? '/'
    this.#heartbeat = options.heartbeat ?? DEFAULT_HEARTBEAT
    this.#heartbeatTimeout = options.heartbeatTimeout ?? this.#heartbeat * 2
    this.#maxPortRetry = options.maxPortRetry ?? DEFAULT_MAX_PORT_RETRY
    this.#maxPayloadSize = options.maxPayloadSize ?? DEFAULT_MAX_PAYLOAD_SIZE
    this.#port = options.port ?? DEFAULT_PORT
  }

  // ── 公共 API ──────────────────────────────────────────────────────────────

  /**
   * 注册 HTTP 路由。必须在 start() 之前调用。
   * @param {string} method - 'GET' | 'POST' | 'PUT' | 'DELETE'
   * @param {string} path - 路径（精确匹配）
   * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
   * @returns {this}
   */
  route(method, path, handler) {
    this.#routes.push({ method: method.toUpperCase(), path, handler })
    return this
  }

  /**
   * 注册连接回调。客户端连接后触发。
   * @param {(client: WsClient) => void} callback
   * @returns {this}
   */
  onConnection(callback) {
    this.#connectionCallbacks.push(callback)
    return this
  }

  /**
   * 注册消息回调。收到客户端消息后触发（JSON 已解析）。
   * @param {(client: WsClient, message: any) => void} callback
   * @returns {this}
   */
  onMessage(callback) {
    this.#messageCallbacks.push(callback)
    return this
  }

  /**
   * 注册关闭回调。客户端断开后触发。
   * @param {(client: WsClient, code?: number, reason?: string) => void} callback
   * @returns {this}
   */
  onClose(callback) {
    this.#closeCallbacks.push(callback)
    return this
  }

  /**
   * 启动服务器。
   * @returns {Promise<number>} 实际监听端口
   */
  async start() {
    if (this.#httpServer) {
      throw new Error('WsServer is already running')
    }

    this.#stopping = false

    // 创建 HTTP 服务器（用于自定义路由 + WebSocket upgrade）
    this.#httpServer = http.createServer((req, res) => {
      this.#handleHttpRequest(req, res)
    })

    // 创建 WebSocketServer，挂载到 HTTP 服务器
    // ws 库自动处理 upgrade 握手和帧编解码
    const wssOptions = {
      server: this.#httpServer,
      maxPayload: this.#maxPayloadSize
    }
    if (this.#path !== '/') {
      wssOptions.path = this.#path
    }
    this.#wss = new WebSocketServer(wssOptions)

    this.#wss.on('connection', (ws) => {
      if (this.#stopping) {
        ws.close(CLOSE_GOING_AWAY)
        return
      }

      const clientId = `ws-${++_clientIdCounter}`
      const client = new WsClient(clientId, ws, this)

      // 存储 WsClient 引用以便在 broadcast / heartbeat 中快速查找
      ws._vetoClient = client

      // 初始化心跳标记（ws 库的 isAlive + 我们自己的 lastPong 双重检测）
      ws._isAlive = true
      ws.on('pong', () => {
        ws._isAlive = true
        client._touch()
      })

      this.#clients.add(client)

      // 触发连接回调
      for (const cb of this.#connectionCallbacks) {
        try {
          cb(client)
        } catch {
          /* ignore callback errors */
        }
      }

      // 消息事件：ws 库已完成帧解码，我们只处理文本 JSON 消息
      ws.on('message', (data, isBinary) => {
        if (isBinary) return
        const msg = data.toString('utf-8')
        try {
          const parsed = JSON.parse(msg)
          for (const cb of this.#messageCallbacks) {
            try {
              cb(client, parsed)
            } catch {
              /* ignore callback errors */
            }
          }
        } catch {
          // ignore malformed JSON
        }
      })

      // close 事件：ws 库保证在所有情况下都会触发（正常关闭、断连、错误后）
      ws.on('close', (code, reason) => {
        const existed = this.#clients.has(client)
        this.#clients.delete(client)
        client._markClosed()
        if (existed) {
          const reasonStr = reason
            ? Buffer.isBuffer(reason)
              ? reason.toString('utf-8')
              : String(reason)
            : 'transport closed'
          for (const cb of this.#closeCallbacks) {
            try {
              cb(client, code, reasonStr)
            } catch {
              /* ignore */
            }
          }
        }
      })

      // error 事件：只做标记，close 事件随后触发并完成清理
      ws.on('error', () => {
        client._markClosed()
      })
    })

    const actualPort = await this.#listen(this.#port)
    this.#port = actualPort
    this.#startHeartbeat()
    return actualPort
  }

  /**
   * 停止服务器。断开所有客户端并关闭 HTTP 服务。
   * @returns {Promise<void>}
   */
  async stop() {
    this.#stopping = true
    this.#stopHeartbeat()

    // 关闭所有 WebSocket 连接
    if (this.#wss) {
      for (const ws of this.#wss.clients) {
        try {
          ws.close(CLOSE_GOING_AWAY)
        } catch {
          /* ignore */
        }
      }
    }
    this.#clients.clear()

    if (this.#httpServer) {
      await new Promise((resolve) => {
        this.#httpServer.close(() => resolve())
      })
      this.#httpServer = null
      this.#wss = null
    }

    this.#port = 0
  }

  /**
   * 向所有（或匹配 filter 的）客户端广播消息。
   * @param {any} data - 可 JSON 序列化的数据
   * @param {(client: WsClient) => boolean} [filter] - 可选过滤器
   */
  broadcast(data, filter) {
    if (!this.#wss || this.#clients.size === 0) return
    const json = JSON.stringify(data)
    for (const ws of this.#wss.clients) {
      if (ws.readyState !== WebSocket.OPEN) continue
      const client = ws._vetoClient
      if (!client) continue
      if (filter && !filter(client)) continue
      if (client.closed) continue
      try {
        ws.send(json)
      } catch {
        this._removeClient(client)
      }
    }
  }

  /** @returns {number} 实际监听端口（未启动时返回 0） */
  get port() {
    return this.#port
  }

  /** @returns {ReadonlySet<WsClient>} 当前连接的所有客户端 */
  get clients() {
    return this.#clients
  }

  // ── 内部方法 ──────────────────────────────────────────────────────────────

  /** @internal 从内部集合中移除客户端 */
  _removeClient(client) {
    const existed = this.#clients.delete(client)
    if (!existed) return
    client._markClosed()
    try {
      client._getWs()?.terminate()
    } catch {
      /* ignore */
    }
  }

  // ── HTTP 请求处理 ──

  /**
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse} res
   */
  #handleHttpRequest(req, res) {
    const url = new URL(req.url ?? '/', `http://localhost:${this.#port}`)

    // 匹配注册的路由
    for (const route of this.#routes) {
      if (req.method === route.method && url.pathname === route.path) {
        try {
          route.handler(req, res)
        } catch {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' })
            res.end('Internal Server Error')
          }
        }
        return
      }
    }

    // 未匹配：返回 426 Upgrade Required
    res.writeHead(426, { 'Content-Type': 'text/plain' })
    res.end('WebSocket only')
  }

  // ── 端口分配 ──

  /**
   * @param {number} startPort
   * @returns {Promise<number>}
   */
  #listen(startPort) {
    return new Promise((resolve, reject) => {
      let attemptPort = startPort

      /** @returns {void} */
      const tryListen = () => {
        this.#httpServer.once('error', (err) => {
          if (err.code === 'EADDRINUSE' && attemptPort < startPort + this.#maxPortRetry) {
            attemptPort++
            tryListen()
          } else {
            reject(err)
          }
        })

        this.#httpServer.listen(attemptPort, this.#host, () => {
          resolve(attemptPort)
        })
      }

      tryListen()
    })
  }

  // ── 心跳 ──

  /** @returns {void} */
  #startHeartbeat() {
    this.#heartbeatTimer = setInterval(() => {
      if (!this.#wss) return
      const now = Date.now()

      for (const ws of this.#wss.clients) {
        // ws 库的 isAlive 机制：上次 ping 后未收到 pong
        if (ws._isAlive === false) {
          ws.terminate()
          continue
        }

        // 额外超时检测：通过 WsClient.lastPong 做业务层超时判断
        const client = ws._vetoClient
        if (client && now - client.lastPong > this.#heartbeatTimeout) {
          ws.terminate()
          continue
        }

        ws._isAlive = false
        try {
          ws.ping()
        } catch {
          ws.terminate()
        }
      }
    }, this.#heartbeat)
  }

  #stopHeartbeat() {
    if (this.#heartbeatTimer) {
      clearInterval(this.#heartbeatTimer)
      this.#heartbeatTimer = null
    }
  }
}
