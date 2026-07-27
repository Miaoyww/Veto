/**
 * logger.ts — 渲染进程日志工厂
 *
 * 基于 electron-log/renderer，通过 IPC 将日志发送到主进程写入文件。
 * 与主进程 logger.ts 保持相同的 API 接口。
 *
 * 使用方式：
 *   import { createLogger } from '$lib/logger'
 *   const log = createLogger('StatusRegistry')
 *   log.info('Registered status:', id)
 *   log.error('Failed to load:', err)
 */

import log from 'electron-log/renderer'

// ── 公共日志接口 ──────────────────────────────────────────────────────────

export interface Logger {
  debug(...params: unknown[]): void
  info(...params: unknown[]): void
  warn(...params: unknown[]): void
  error(...params: unknown[]): void
}

// ── 工厂函数 ──────────────────────────────────────────────────────────────

/**
 * 创建一个带标签的模块日志器。
 * 标签会出现在每条日志输出中，便于追踪来源。
 */
export function createLogger(tag: string): Logger {
  return log.create({ logId: tag }) as Logger
}
