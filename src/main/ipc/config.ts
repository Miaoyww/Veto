/**
 * ipc/config.ts — 插件配置 IPC 处理器
 *
 * 提供插件全局配置的读写（禁用列表、加载顺序等）。
 */

import { ipcMain } from 'electron'
import { loadPluginConfig, savePluginConfig, type PluginConfig } from '../plugin-store'

export function registerConfigIpc(refreshPlugins: () => void): void {
  ipcMain.handle('veto:config:get', () => {
    return loadPluginConfig()
  })

  ipcMain.handle('veto:config:set', (_event, config: PluginConfig) => {
    savePluginConfig(config)
    refreshPlugins()
    return { success: true }
  })
}
