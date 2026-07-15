/**
 * plugin-storage-factory.ts — 存储后端工厂函数
 *
 * Electron 桌面环境：插件存储由主进程管理（文件系统），
 * 渲染进程通过 IPC (window.veto) 访问。
 */

import type { PluginStorage } from './plugin-storage'

let storageInstance: PluginStorage | null = null

/**
 * 初始化存储后端
 * 应在应用启动时调用一次
 *
 * @returns 初始化后的存储实例
 * @throws 初始化失败时抛出错误
 */
export async function initPluginStorage(): Promise<PluginStorage> {
  if (storageInstance) return storageInstance

  try {
    const { IpcPluginStorage } = await import('./plugin-storage-ipc')
    storageInstance = new IpcPluginStorage()
    console.log('[PluginStorage] Initialized with IPC filesystem backend')
  } catch (err) {
    console.error('[PluginStorage] Initialization failed:', err)
    throw err
  }

  return storageInstance
}

/**
 * 获取存储实例
 * 必须在 initPluginStorage() 之后调用
 *
 * @returns 存储实例
 * @throws 未初始化时抛出错误
 */
export function getPluginStorage(): PluginStorage {
  if (!storageInstance) {
    throw new Error('PluginStorage not initialized. Call initPluginStorage() first.')
  }
  return storageInstance
}

/**
 * 重置存储实例（仅用于测试或重新初始化）
 */
export function resetPluginStorage(): void {
  storageInstance = null
}
