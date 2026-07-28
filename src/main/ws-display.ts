/**
 * ws-display.ts — Display 窗口 WebSocket 通信
 *
 * 基于 `ws` 包实现，替代自建的 ws-server.ts。
 * 用于模拟大会双窗口模式下的实时消息转发。
 *
 * - 端口从 19527 开始尝试，冲突时递增
 * - 接收到的消息广播给所有连接的客户端
 */

import { WebSocketServer, WebSocket } from 'ws'
import { createLogger } from './logger'

const log = createLogger('DisplayWS')

const DEFAULT_PORT = 19527
const MAX_RETRY = 99

let wss: WebSocketServer | null = null

/**
 * 启动 Display WebSocket 服务器。
 * @returns 实际监听端口
 */
export function startDisplayWs(): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryListen = (port: number): void => {
      const server = new WebSocketServer({ port, host: '127.0.0.1' })

      server.on('listening', () => {
        wss = server
        log.info(`Display WS listening on ws://127.0.0.1:${port}`)
        setupConnectionHandler(server)
        resolve(port)
      })

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && port < DEFAULT_PORT + MAX_RETRY) {
          server.close()
          tryListen(port + 1)
        } else {
          reject(err)
        }
      })
    }

    tryListen(DEFAULT_PORT)
  })
}

/** 设置连接处理 */
function setupConnectionHandler(server: WebSocketServer): void {
  server.on('connection', (ws: WebSocket) => {
    log.info(`Display client connected (total: ${server.clients.size})`)

    ws.on('message', (data: Buffer) => {
      try {
        const parsed = JSON.parse(data.toString())
        // host 类型消息标记发送者
        if (parsed.type === 'host') {
          ;(ws as any).__isHost = true
        }
        // 广播给所有客户端
        const payload = JSON.stringify(parsed)
        for (const client of server.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload)
          }
        }
      } catch {
        // 非 JSON 消息静默丢弃
      }
    })

    ws.on('close', () => {
      log.info(`Display client disconnected (total: ${server.clients.size})`)
    })

    ws.on('error', () => {
      /* 连接错误由 close 事件处理 */
    })
  })
}

/** 停止 Display WebSocket 服务器 */
export function stopDisplayWs(): Promise<void> {
  return new Promise((resolve) => {
    if (!wss) return resolve()
    for (const client of wss.clients) {
      client.terminate()
    }
    wss.close(() => {
      wss = null
      resolve()
    })
  })
}

/** 获取 Display WS 端口 */
export function getDisplayWsPort(): number {
  return (wss?.address() as { port: number })?.port ?? 0
}
