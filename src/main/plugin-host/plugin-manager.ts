/**
 * plugin-manager.ts — Service 插件生命周期管理
 *
 * 取代旧 service-manager.ts。核心变化：
 * - 插件以独立 OS 进程运行（child_process.spawn），不再使用 dynamic import()
 * - 通过 PluginServer（WS + HTTP）与插件通信，不再注入 ServiceContext
 * - 崩溃自动重启（指数退避，最多 5 次）
 */

import type { ChildProcess } from 'child_process'
import type { PluginInstance } from '../plugin-discovery'
import type { PluginRuntime } from './runtimes/runtime'
import { NodeRuntime } from './runtimes/node-runtime'
import { createLogger } from '../logger'

const log = createLogger('PluginManager')

// ── 类型 ────────────────────────────────────────────────────────────────────

export type PluginProcessStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'error'

/** 运行中的插件记录 */
export interface RunningPlugin {
  pluginId: string
  name: string
  version: string
  status: PluginProcessStatus
  startedAt: number
  restartCount: number
  child?: ChildProcess
}

/** 崩溃自动重启配置 */
interface RestartConfig {
  maxRestarts: number       // 最大重启次数
  baseDelay: number         // 基础延迟 ms
  maxDelay: number          // 最大延迟 ms
  windowMs: number          // 计数窗口 ms
}

// ── 默认配置 ────────────────────────────────────────────────────────────────

const DEFAULT_RESTART: RestartConfig = {
  maxRestarts: 5,
  baseDelay: 1000,
  maxDelay: 30_000,
  windowMs: 60_000,
}

// ── PluginManager ───────────────────────────────────────────────────────────

export class PluginManager {
  private plugins = new Map<string, RunningPlugin>()
  private runtimes: PluginRuntime[] = [new NodeRuntime()]
  private serverPort: number
  private restartHistory = new Map<string, number[]>() // pluginId → crash timestamps

  constructor(serverPort: number) {
    this.serverPort = serverPort
  }

  // ── 公共 API ──────────────────────────────────────────────────────────

  /** 启动所有已启用且未禁用的 service 插件 */
  async startAll(pluginInstances: PluginInstance[]): Promise<void> {
    const servicePlugins = pluginInstances.filter(
      (p) => p.path.service != null && !p.disabled && !p.incompatible
    )

    for (const plugin of servicePlugins) {
      if (this.plugins.has(plugin.manifest.id)) continue
      try {
        await this.start(plugin)
      } catch (err) {
        log.error(`Failed to start ${plugin.manifest.id}:`, err)
      }
    }

    log.info(
      `${this.plugins.size} plugin(s) running (${servicePlugins.length} eligible)`
    )
  }

  /** 启动单个插件 */
  async start(plugin: PluginInstance): Promise<void> {
    const pluginId = plugin.manifest.id
    const runtimeName = plugin.manifest.runtime ?? 'nodejs'

    if (this.plugins.has(pluginId)) {
      log.warn(`Plugin ${pluginId} is already running`)
      return
    }

    const runtime = this.runtimes.find((r) => r.name === runtimeName)
    if (!runtime) {
      throw new Error(`Unknown runtime "${runtimeName}" for plugin "${pluginId}"`)
    }

    if (!runtime.isAvailable()) {
      throw new Error(`Runtime "${runtimeName}" is not available on this system`)
    }

    const record: RunningPlugin = {
      pluginId,
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      status: 'starting',
      startedAt: Date.now(),
      restartCount: 0,
    }
    this.plugins.set(pluginId, record)

    try {
      const child = runtime.spawn({ plugin, serverPort: this.serverPort })
      record.child = child

      child.on('spawn', () => {
        record.status = 'running'
        log.info(`Plugin started: ${pluginId} (pid=${child.pid})`)
      })

      child.on('exit', (code, signal) => {
        record.status = 'stopped'
        log.info(
          `Plugin exited: ${pluginId} (code=${code}, signal=${signal})`
        )

        // 非零退出码且非主动信号 → 可能是崩溃
        if (code !== 0 && code !== null && signal === null) {
          this.handleCrash(plugin)
        } else {
          this.plugins.delete(pluginId)
        }
      })

      child.on('error', (err) => {
        record.status = 'error'
        log.error(`Plugin error: ${pluginId}:`, err.message)
      })
    } catch (err) {
      record.status = 'error'
      this.plugins.delete(pluginId)
      throw err
    }
  }

  /** 停止单个插件 */
  async stop(pluginId: string): Promise<void> {
    const record = this.plugins.get(pluginId)
    if (!record) return

    record.status = 'stopping'

    if (record.child && !record.child.killed) {
      // 先尝试 SIGTERM
      record.child.kill('SIGTERM')

      // 5 秒超时后 SIGKILL
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (record.child && !record.child.killed) {
            log.warn(`Force killing ${pluginId}`)
            record.child.kill('SIGKILL')
          }
          resolve()
        }, 5000)

        record.child?.on('exit', () => {
          clearTimeout(timeout)
          resolve()
        })
      })
    }

    this.plugins.delete(pluginId)
    log.info(`Plugin stopped: ${pluginId}`)
  }

  /** 停止所有插件 */
  async stopAll(): Promise<void> {
    const ids = Array.from(this.plugins.keys())
    const results = await Promise.allSettled(ids.map((id) => this.stop(id)))

    for (let i = 0; i < ids.length; i++) {
      const result = results[i]
      if (result.status === 'rejected') {
        log.error(`Failed to stop ${ids[i]}:`, result.reason)
      }
    }

    log.info('All plugins stopped')
  }

  /** 重新加载插件（停止 → 启动） */
  async reload(plugin: PluginInstance): Promise<void> {
    await this.stop(plugin.manifest.id)

    if (!plugin.disabled && !plugin.incompatible && plugin.path.service) {
      await this.start(plugin)
    }
  }

  /** 获取运行中的插件列表 */
  getRunningPlugins(): Array<{
    id: string
    name: string
    version: string
    status: PluginProcessStatus
    startedAt: number
    restartCount: number
  }> {
    return Array.from(this.plugins.values()).map((p) => ({
      id: p.pluginId,
      name: p.name,
      version: p.version,
      status: p.status,
      startedAt: p.startedAt,
      restartCount: p.restartCount,
    }))
  }

  /** 获取单个插件状态 */
  getPluginStatus(pluginId: string): PluginProcessStatus | null {
    return this.plugins.get(pluginId)?.status ?? null
  }

  // ── 崩溃恢复 ──────────────────────────────────────────────────────────

  private handleCrash(plugin: PluginInstance): void {
    const pluginId = plugin.manifest.id
    const record = this.plugins.get(pluginId)
    if (!record) return

    // 记录崩溃时间戳
    const now = Date.now()
    if (!this.restartHistory.has(pluginId)) {
      this.restartHistory.set(pluginId, [])
    }
    const history = this.restartHistory.get(pluginId)!

    // 清理过期记录
    while (history.length > 0 && now - history[0] > DEFAULT_RESTART.windowMs) {
      history.shift()
    }
    history.push(now)

    // 检查重启次数限制
    if (history.length > DEFAULT_RESTART.maxRestarts) {
      log.error(
        `Plugin ${pluginId} crashed ${history.length} times in ${DEFAULT_RESTART.windowMs / 1000}s, giving up`
      )
      record.status = 'error'
      this.plugins.delete(pluginId)
      return
    }

    // 指数退避
    const attempt = record.restartCount
    const delay = Math.min(
      DEFAULT_RESTART.baseDelay * Math.pow(2, attempt),
      DEFAULT_RESTART.maxDelay
    )

    log.info(
      `Restarting ${pluginId} in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${DEFAULT_RESTART.maxRestarts})`
    )

    setTimeout(() => {
      record.restartCount++
      this.start(plugin).catch((err) => {
        log.error(`Restart failed for ${pluginId}:`, err)
      })
    }, delay)
  }
}
