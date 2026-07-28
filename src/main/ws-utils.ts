/**
 * ws-utils.ts — WebSocket 帧编解码工具
 *
 * 从 ws-server.ts 提取，供 WsServer 及 PluginServer 复用。
 * 零依赖，纯 Buffer 操作。
 */

export const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

/** 编码文本帧（opcode 0x1） */
export function encodeFrame(payload: string): Buffer {
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

/** 编码 ping 帧（opcode 0x9） */
export function encodePingFrame(): Buffer {
  return Buffer.from([0x89, 0x00])
}

/** 编码 pong 帧（opcode 0xA），回复客户端 ping */
export function encodePongFrame(payload: Buffer): Buffer {
  const len = payload.length
  const frame = Buffer.alloc(2 + len)
  frame[0] = 0x8a // FIN + opcode 0xA
  frame[1] = len  // 服务端不 mask
  payload.copy(frame, 2)
  return frame
}

/** 编码 close 帧（opcode 0x8） */
export function encodeCloseFrame(code = 1000): Buffer {
  const buf = Buffer.alloc(2)
  buf.writeUInt16BE(code, 0)
  const frame = Buffer.alloc(2 + buf.length)
  frame[0] = 0x88
  frame[1] = buf.length
  buf.copy(frame, 2)
  return frame
}

/**
 * 解码 WebSocket 帧。
 * @returns 消息字符串，'__CLOSE__'，'__PONG__'，或 null（不完整/未知帧）
 */
export function decodeFrame(data: Buffer): string | null {
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

  if (opcode === 0x8) return '__CLOSE__'
  if (opcode === 0xA) return '__PONG__'
  if (opcode === 0x1) return payload.toString('utf-8')
  return null
}

/** 执行 WebSocket 握手，返回 Accept 密钥 */
export function computeAcceptKey(clientKey: string): string {
  const crypto = require('crypto')
  return crypto
    .createHash('sha1')
    .update(clientKey + WS_GUID)
    .digest('base64')
}

/** 发送 WebSocket 握手响应 */
export function sendHandshake(socket: import('stream').Duplex, clientKey: string): void {
  const acceptKey = computeAcceptKey(clientKey)
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
      '\r\n'
  )
}

/**
 * 获取消息的 payload 长度（用于判断帧是否完整）。
 * 返回 { headerLen: number, payloadLen: number } 或 null（无法解析）。
 */
export function peekFrameLength(data: Buffer): { headerLen: number; payloadLen: number } | null {
  if (data.length < 2) return null

  let payloadLen = data[1] & 0x7f
  const masked = (data[1] & 0x80) !== 0
  let headerLen = 2

  if (payloadLen === 126) {
    if (data.length < 4) return null
    payloadLen = data.readUInt16BE(2)
    headerLen = 4
  } else if (payloadLen === 127) {
    if (data.length < 10) return null
    payloadLen = Number(data.readBigUInt64BE(2))
    headerLen = 10
  }

  if (masked) headerLen += 4
  return { headerLen, payloadLen }
}
