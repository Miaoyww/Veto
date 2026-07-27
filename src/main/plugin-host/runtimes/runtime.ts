/**
 * runtime.ts — PluginRuntime 接口
 *
 * 抽象运行时层，让 PluginManager 不依赖具体运行时（Node.js、Python 等）。
 */

import type { ChildProcess } from 'child_process'
import type { PluginInstance } from '../../plugin-discovery'

/** runtime 生成参数 */
export interface RuntimeSpawnOptions {
  plugin: PluginInstance
  serverPort: number
}

/** 插件运行时接口 */
export interface PluginRuntime {
  /** 运行时标识（如 "nodejs", "python3"） */
  readonly name: string

  /** 检查运行时是否在系统上可用 */
  isAvailable(): boolean

  /** 启动插件进程 */
  spawn(options: RuntimeSpawnOptions): ChildProcess
}
