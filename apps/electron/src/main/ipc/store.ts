/**
 * ipc/store.ts — 应用数据存储 IPC 处理器
 *
 * 为 Renderer 提供文件持久化接口（CRUD + 迁移）。
 * 底层通过 data/store.ts 操作 JSON 文件。
 */

import { ipcMain } from 'electron'
import { loadStore, saveStore, deleteStore, migrateFromLocalStorage, type StoreDomain } from '../data/store'

export function registerStoreIpc(): void {
  ipcMain.handle('veto:store:load', (_event, domain: string) => {
    return loadStore(domain as StoreDomain)
  })

  ipcMain.handle('veto:store:save', (_event, domain: string, data: unknown) => {
    saveStore(domain as StoreDomain, data)
    return { success: true }
  })

  ipcMain.handle('veto:store:delete', (_event, domain: string) => {
    deleteStore(domain as StoreDomain)
    return { success: true }
  })

  ipcMain.handle('veto:store:migrate', (_event, domain: string, jsonData: string) => {
    migrateFromLocalStorage(domain as StoreDomain, jsonData)
    return { success: true }
  })
}
