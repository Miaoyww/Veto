/**
 * node-runtime.ts — Node.js 运行时实现
 *
 * 使用 child_process.fork 启动独立的 Node.js 进程运行插件。
 * fork() 使用 Electron 内嵌的 Node.js（而非系统 PATH 中的 node），
 * 确保版本一致性并避免兼容性问题。
 */

import { fork, type ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import type { PluginRuntime, RuntimeSpawnOptions } from './runtime'
import { createLogger } from '../../logger'

const log = createLogger('NodeRuntime')

export class NodeRuntime implements PluginRuntime {
  readonly name = 'nodejs'

  isAvailable(): boolean {
    // Node.js 始终可用（在 Electron 环境中）
    return true
  }

  spawn(options: RuntimeSpawnOptions): ChildProcess {
    const plugin = options.plugin
    const pluginDir = plugin.path.plugin
    const entryPath = plugin.path.service!

    // 确保 node_modules/@veto/sdk 存在
    this.ensureSdkAvailable(pluginDir)

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      VETO_SERVER_PORT: String(options.serverPort),
      VETO_WS_PORT: String(options.serverPort),
      VETO_HTTP_PORT: String(options.serverPort),
      VETO_PLUGIN_ID: plugin.manifest.id,
      VETO_PLUGIN_DIR: pluginDir,
    }

    log.info(`Forking: "${entryPath}" (plugin: ${plugin.manifest.id})`)

    // 使用 fork() 而非 spawn('node')，确保使用 Electron 内嵌的 Node.js
    // 避免依赖系统 PATH 中的 node（版本可能不兼容，如 Node 24 + Koishi 4.x）
    const child = fork(entryPath, [], {
      cwd: pluginDir,
      env,
      silent: true,        // 捕获 stdout/stderr（等价于 pipe）
      windowsHide: true,   // @ts-expect-error: windowsHide 是 spawn() 的有效参数，fork() 内部透传，但 @types/node 的 ForkOptions 类型遗漏了它
    })

    // 转发 stdout/stderr 到主进程日志 + renderer DevTools
    const pluginId = plugin.manifest.id
    const pluginLog = createLogger(`Plugin:${pluginId}`)
    child.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString('utf-8').trim()
      for (const line of lines.split('\n')) {
        if (line) {
          const text = line.trim()
          if (!text) continue
          pluginLog.info(text)
          // 转发到 renderer DevTools console
          for (const win of BrowserWindow.getAllWindows()) {
            try {
              win.webContents.send('veto:event', {
                event: 'plugin:log',
                data: { pluginId, level: 'log', message: text, timestamp: Date.now() }
              })
            } catch { /* window may be destroyed */ }
          }
        }
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString('utf-8').trim()
      for (const line of lines.split('\n')) {
        if (line) {
          const text = line.trim()
          if (!text) continue
          pluginLog.error(text)
          // 转发到 renderer DevTools console
          for (const win of BrowserWindow.getAllWindows()) {
            try {
              win.webContents.send('veto:event', {
                event: 'plugin:log',
                data: { pluginId, level: 'error', message: text, timestamp: Date.now() }
              })
            } catch { /* window may be destroyed */ }
          }
        }
      }
    })

    return child
  }

  /**
   * 确保插件的 node_modules 中有 @veto/sdk。
   * 如果不存在，从 monorepo 的 packages/veto-sdk/src/ 复制。
   */
  private ensureSdkAvailable(pluginDir: string): void {
    const sdkDest = path.join(pluginDir, 'node_modules', '@veto/sdk')
    if (fs.existsSync(path.join(sdkDest, 'package.json'))) return

    // 尝试从 monorepo 路径定位 SDK 源码
    // 在开发模式下，SDK 在 {appDir}/packages/veto-sdk/
    // 需要找到 Veto 项目根目录
    const possiblePaths = [
      path.join(pluginDir, '..', '..', '..', '..', 'packages', 'veto-sdk'), // 相对路径回退到项目根
    ]

    // 也尝试通过 __dirname 定位
    try {
      const { app } = require('electron')
      const appDir = path.dirname(app.getPath('exe'))
      possiblePaths.push(path.join(appDir, '..', 'packages', 'veto-sdk'))
      possiblePaths.push(path.join(appDir, 'packages', 'veto-sdk'))
      // 开发模式：app.getAppPath() 返回项目根目录
      possiblePaths.push(path.join(app.getAppPath(), 'packages', 'veto-sdk'))
    } catch {
      // 非 Electron 环境，忽略
    }

    for (const srcPath of possiblePaths) {
      if (fs.existsSync(path.join(srcPath, 'package.json'))) {
        try {
          this.copyDir(srcPath, sdkDest)
          log.info(`Copied @veto/sdk from ${srcPath} to ${sdkDest}`)
          return
        } catch (err) {
          log.warn(`Failed to copy SDK from ${srcPath}:`, err)
        }
      }
    }

    log.warn('Could not find @veto/sdk source to copy. Plugin may fail to start.')
  }

  private copyDir(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }

    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      if (entry.isDirectory() && entry.name !== 'node_modules') {
        this.copyDir(srcPath, destPath)
      } else if (entry.isFile()) {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }
}
