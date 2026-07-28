/**
 * ws-server.d.ts — WsServer TypeScript 声明
 */

import type * as http from 'node:http'
import type { Duplex } from 'node:stream'

// ── 配置选项 ─────────────────────────────────────────────────────────────────

export interface WsServerOptions {
  /** 首选端口，默认 19529，冲突时自动递增 */
  port?: number
  /** 绑定地址，默认 '127.0.0.1' */
  host?: string
  /** WebSocket 升级路径，默认 '/'（所有路径） */
  path?: string
  /** Ping 间隔（毫秒），默认 5000 */
  heartbeat?: number
  /** Pong 超时（毫秒），默认 2 * heartbeat */
  heartbeatTimeout?: number
  /** 最大端口递增次数，默认 99 */
  maxPortRetry?: number
  /** 最大帧 payload 字节数，默认 1048576（1 MB） */
  maxPayloadSize?: number
}

// ── 回调类型 ─────────────────────────────────────────────────────────────────

export type HttpHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void

export type ConnectionCallback = (client: WsClient) => void

export type MessageCallback = (client: WsClient, message: any) => void

export type CloseCallback = (client: WsClient, code?: number, reason?: string) => void

// ── WsClient ──────────────────────────────────────────────────────────────────

export declare class WsClient {
  /** 唯一标识 */
  readonly id: string
  /** 连接时间（Date.now()） */
  readonly connectedAt: number
  /** 最后 pong 时间戳，由心跳机制更新 */
  lastPong: number
  /** 是否已关闭 */
  readonly closed: boolean

  /** 插件自定义数据 */
  data: any

  /**
   * 向客户端发送 JSON 消息。
   * @param data - 可 JSON 序列化的数据
   */
  send(data: any): void

  /**
   * 关闭连接。
   * @param code - WebSocket 关闭码，默认 1000
   */
  close(code?: number): void
}

// ── WsServer ─────────────────────────────────────────────────────────────────

export declare class WsServer {
  constructor(options?: WsServerOptions)

  /**
   * 注册 HTTP 路由。必须在 start() 之前调用。
   * @param method - 'GET' | 'POST' | 'PUT' | 'DELETE'
   * @param path - 路径（精确匹配）
   * @param handler - 请求处理函数
   */
  route(method: string, path: string, handler: HttpHandler): this

  /**
   * 注册连接回调。客户端连接后触发。
   * @param callback - 接收新创建的 WsClient
   */
  onConnection(callback: ConnectionCallback): this

  /**
   * 注册消息回调。收到客户端消息后触发（JSON 已解析）。
   * @param callback - 接收 WsClient 和已解析的 JSON 消息
   */
  onMessage(callback: MessageCallback): this

  /**
   * 注册关闭回调。客户端断开后触发。
   * @param callback - 接收 WsClient、关闭码和原因
   */
  onClose(callback: CloseCallback): this

  /**
   * 启动服务器。
   * @returns 实际监听端口
   */
  start(): Promise<number>

  /**
   * 停止服务器。断开所有客户端并关闭 HTTP 服务。
   */
  stop(): Promise<void>

  /**
   * 向所有（或匹配 filter 的）客户端广播消息。
   * @param data - 可 JSON 序列化的数据
   * @param filter - 可选过滤器，返回 false 跳过该客户端
   */
  broadcast(data: any, filter?: (client: WsClient) => boolean): void

  /** 实际监听端口（未启动时返回 0） */
  get port(): number

  /** 当前连接的所有客户端 */
  get clients(): ReadonlySet<WsClient>
}
