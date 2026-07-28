/**
 * ws-server.ts — 内建 WebSocket 服务器
 * ──────────────────────────────────────────
 * 在主进程中运行，不需要额外依赖。
 * 基于 Node.js http 协议。
 *
 * 端口：从 19527 开始尝试，如遇冲突则递增寻找可用端口
 *
 * 消息协议（JSON）：
 *   { type: "host", data: ConferenceDisplayData }   // 主机 → 服务器
 *   服务器自动广播 data 到所有非 host 的客户端
 */

import * as http from 'http'
import type { Duplex } from 'stream'
import { createLogger } from './logger'
import {
  encodeFrame,
  encodePingFrame,
  encodePongFrame,
  decodeFrame,
  sendHandshake,
} from './ws-utils'

const log = createLogger('WS')

const WS_BASE_PORT = 19527
const WS_MAX_RETRY = 99

const HEARTBEAT_INTERVAL = 5_000   // 每 5 秒发送一次 ping
const HEARTBEAT_TIMEOUT = 10_000  // 超过 10 秒无 pong 视为断连

interface WsClient {
  socket: Duplex
  isHost: boolean
  lastPong: number
}

const clients = new Set<WsClient>()

// ---- 广播 ----
function broadcast(data: unknown, excludeHost: boolean = false): void {
  const payload = encodeFrame(JSON.stringify(data))
  for (const client of clients) {
    if (excludeHost && client.isHost) continue
    try {
      client.socket.write(payload)
    } catch {
      clients.delete(client)
    }
  }
}

// ---- 启动服务器 ----
export function startWsServer(): Promise<number> {
  const httpServer = http.createServer((_req, res) => {
    res.writeHead(426, { 'Content-Type': 'text/plain' })
    res.end('WebSocket only')
  })

  httpServer.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key']
    if (!key) {
      socket.destroy()
      return
    }

    sendHandshake(socket, key)

    const client: WsClient = { socket, isHost: false, lastPong: Date.now() }
    clients.add(client)

    log.info(`Client connected (total: ${clients.size})`)

    let buffer = Buffer.alloc(0)

    socket.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk])

      // 尝试解析完整帧
      while (buffer.length >= 2) {
        const payloadLen = buffer[1] & 0x7f
        let totalLen = 2
        if (payloadLen === 126) totalLen = 4
        else if (payloadLen === 127) totalLen = 10

        const maskBit = (buffer[1] & 0x80) !== 0
        if (maskBit) totalLen += 4

        let dataLen = payloadLen
        if (payloadLen === 126 && buffer.length >= 4) {
          dataLen = buffer.readUInt16BE(2)
        } else if (payloadLen === 127 && buffer.length >= 10) {
          dataLen = Number(buffer.readBigUInt64BE(2))
        }

        const frameLen = totalLen + dataLen
        if (buffer.length < frameLen) break // 不完整帧，等更多数据

        const frame = buffer.subarray(0, frameLen)
        buffer = buffer.subarray(frameLen)

        const msg = decodeFrame(frame)
        if (msg === '__CLOSE__') {
          clients.delete(client)
          log.info(`Client disconnected (total: ${clients.size})`)
          return
        }

        if (msg === '__PONG__') {
          client.lastPong = Date.now()
          continue
        }

        if (msg === '__PING__') {
          // RFC 6455: 收到 Ping 必须回复 Pong
          try {
            client.socket.write(encodePongFrame(Buffer.alloc(0)))
          } catch {
            /* ignore */
          }
          client.lastPong = Date.now()
          continue
        }

        if (msg) {
          try {
            const parsed = JSON.parse(msg)
            if (parsed.type === 'host') {
              client.isHost = true
              // 广播给所有非 host 客户端
              broadcast(parsed.data, false)
            }
          } catch {
            // ignore malformed
          }
        }
      }
    })

    socket.on('close', () => {
      clients.delete(client)
      log.info(`Client disconnected (total: ${clients.size})`)
    })

    socket.on('error', () => {
      clients.delete(client)
    })
  })

  // ---- 心跳检测 ----
  const heartbeatTimer = setInterval(() => {
    const now = Date.now()
    const pingFrame = encodePingFrame()

    for (const client of clients) {
      // 超时未响应 pong，视为断连
      if (now - client.lastPong > HEARTBEAT_TIMEOUT) {
        clients.delete(client)
        try { client.socket.destroy() } catch { /* ignore */ }
        log.warn(`Client heartbeat timeout (total: ${clients.size})`)
        continue
      }

      // 发送 ping
      try {
        client.socket.write(pingFrame)
      } catch {
        clients.delete(client)
      }
    }
  }, HEARTBEAT_INTERVAL)

  // 服务器关闭时清理定时器
  httpServer.on('close', () => {
    clearInterval(heartbeatTimer)
  })

  return new Promise((resolve, reject) => {
    let attemptPort = WS_BASE_PORT

    function tryListen(): void {
      httpServer.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && attemptPort < WS_BASE_PORT + WS_MAX_RETRY) {
          attemptPort++
          tryListen()
        } else {
          reject(err)
        }
      })

      httpServer.listen(attemptPort, () => {
        log.info(`WebSocket server listening on ws://localhost:${attemptPort}`)
        resolve(attemptPort)
      })
    }

    tryListen()
  })
}
