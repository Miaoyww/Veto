/**
 * api.ts — veto 虚拟模块的运行时 API 实现
 *
 * 第一版只实现 logger，但结构设计为方便后续扩展 storage / events / commands 等。
 */

import { createLogger as createMainLogger } from '../../logger'
import type { Logger as MainLogger } from '../../logger'

// ═══════════════════════════════════════════════════════════════════════════════
// Logger
// ═══════════════════════════════════════════════════════════════════════════════

/** 暴露给插件的 Logger 接口 */
export interface VetoLogger {
  info(message: string): void
  warn(message: string): void
  error(error: Error | string): void
  debug(message: string): void
}

/**
 * 为指定插件创建一个带命名空间的 logger。
 * 输出格式: [VetoExpress][plugin-id][LEVEL] message
 */
export function createPluginLogger(pluginId: string): VetoLogger {
  const mainLogger: MainLogger = createMainLogger(`Plugin:${pluginId}`)

  return {
    info(message: string): void {
      console.log(`[VetoExpress][${pluginId}][INFO] ${message}`)
      mainLogger.info(message)
    },

    warn(message: string): void {
      console.warn(`[VetoExpress][${pluginId}][WARN] ${message}`)
      mainLogger.warn(message)
    },

    error(error: Error | string): void {
      const msg = typeof error === 'string' ? error : error.message
      console.error(`[VetoExpress][${pluginId}][ERROR] ${msg}`)
      if (typeof error !== 'string') {
        console.error(error.stack)
      }
      mainLogger.error(msg)
    },

    debug(message: string): void {
      console.debug(`[VetoExpress][${pluginId}][DEBUG] ${message}`)
      mainLogger.debug(message)
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PluginContext
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PluginContext — 注入到 activate(context) 的上下文对象。
 *
 * 当前只包含 id 和 logger。
 * 结构预留了 storage / events / commands 等未来扩展字段。
 */
export interface VetoPluginContext {
  readonly id: string
  readonly logger: VetoLogger
  readonly extensionPath: string
  readonly metadata: Record<string, unknown>

  // ── 未来扩展 ──────────────────────────────────────────────────────────
  // readonly storage: VetoStorage
  // readonly events: VetoEventBus
  // readonly commands: VetoCommands
}

/** 创建 PluginContext 的工厂选项 */
export interface CreateContextOptions {
  pluginId: string
  extensionPath: string
  metadata?: Record<string, unknown>
}

export function createPluginContext(options: CreateContextOptions): VetoPluginContext {
  return {
    id: options.pluginId,
    logger: createPluginLogger(options.pluginId),
    extensionPath: options.extensionPath,
    metadata: options.metadata ?? {},
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Veto API object — 即 require("veto") 返回的对象
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 构建暴露给插件的 veto 模块对象。
 * 这个对象就是 `import { logger } from "veto"` 中 "veto" 的实际内容。
 *
 * 当前只导出一个全局 logger（插件级），插件通过 context.logger 获得专属 logger。
 * 模块顶层导出的 logger 是一个"未命名"的通用实例，用于插件在 activate() 之前
 * 或模块顶层测试输出。
 */
export interface VetoApi {
  logger: VetoLogger
}

export function createVetoApi(pluginId: string): VetoApi {
  return {
    logger: createPluginLogger(pluginId),
  }
}
