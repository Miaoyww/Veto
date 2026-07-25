/**
 * ws-server.ts — 内建 WebSocket 服务器
 * ──────────────────────────────────────────
 * 在主进程中运行，不需要额外依赖。
 * 基于 Node.js http + crypto（WebSocket 握手 + 帧协议）。
 *
 * 端口：固定 19527（VETO）
 *
 * 消息协议（JSON）：
 *   { type: "host", data: ConferenceDisplayData }   // 主机 → 服务器
 *   服务器自动广播 data 到所有非 host 的客户端
 */

import * as http from 'http'
import * as crypto from 'crypto'
import type { Duplex } from 'stream'

const WS_PORT = 19527
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

interface WsClient {
  socket: Duplex
  isHost: boolean
}

const clients = new Set<WsClient>()

// ---- WebSocket 帧编码（发送文本帧） ----
function encodeFrame(payload: string): Buffer {
  const buf = Buffer.from(payload, 'utf-8')
  const len = buf.length
  const frames: Buffer[] = []

  // FIN + opcode 0x1 (text)
  frames.push(Buffer.from([0x81]))

  if (len < 126) {
    frames.push(Buffer.from([len]))
  } else if (len < 65536) {
    const ext = Buffer.alloc(3)
    ext[0] = 126
    ext.writeUInt16BE(len, 1)
    frames.push(ext)
  } else {
    const ext = Buffer.alloc(9)
    ext[0] = 127
    ext.writeBigUInt64BE(BigInt(len), 1)
    frames.push(ext)
  }

  frames.push(buf)
  return Buffer.concat(frames)
}

// ---- WebSocket 帧解码 ----
function decodeFrame(data: Buffer): string | null {
  if (data.length < 2) return null

  const opcode = data[0] & 0x0f
  const masked = (data[1] & 0x80) !== 0
  let payloadLen = data[1] & 0x7f
  let offset = 2

  if (payloadLen === 126) {
    if (data.length < 4) return null
    payloadLen = data.readUInt16BE(2)
    offset = 4
  } else if (payloadLen === 127) {
    if (data.length < 10) return null
    payloadLen = Number(data.readBigUInt64BE(2))
    offset = 10
  }

  const maskKey = masked ? data.subarray(offset, offset + 4) : null
  const payloadStart = masked ? offset + 4 : offset
  const payload = data.subarray(payloadStart, payloadStart + payloadLen)

  if (masked && maskKey) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskKey[i % 4]
    }
  }

  // 只处理 text (opcode 1) 和 close (opcode 8)
  if (opcode === 0x8) return '__CLOSE__'
  if (opcode === 0x1) return payload.toString('utf-8')
  return null
}

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
export function startWsServer(): number {
  const server = http.createServer((_req, res) => {
    res.writeHead(426, { 'Content-Type': 'text/plain' })
    res.end('WebSocket only')
  })

  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key']
    if (!key) {
      socket.destroy()
      return
    }

    // 握手
    const acceptKey = crypto
      .createHash('sha1')
      .update(key + WS_GUID)
      .digest('base64')

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
        '\r\n'
    )

    const client: WsClient = { socket, isHost: false }
    clients.add(client)

    console.log(`[WS] Client connected (total: ${clients.size})`)

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
          console.log(`[WS] Client disconnected (total: ${clients.size})`)
          return
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
      console.log(`[WS] Client disconnected (total: ${clients.size})`)
    })

    socket.on('error', () => {
      clients.delete(client)
    })
  })

  server.listen(WS_PORT, () => {
    console.log(`[WS] WebSocket server listening on ws://localhost:${WS_PORT}`)
  })

  return WS_PORT
}
