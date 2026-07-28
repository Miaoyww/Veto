/**
 * ipc/updater.ts — 自动更新 IPC 处理器
 *
 * 提供 Electron autoUpdater 的控制接口：
 * 检查更新、下载、安装，以及版本查询。
 */

import { ipcMain, app } from 'electron'
import { autoUpdater } from 'electron-updater'

export function registerUpdaterIpc(): void {
  ipcMain.handle('veto:updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, result }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('veto:updater:download', async () => {
    try {
      const result = await autoUpdater.downloadUpdate()
      return { success: true, result }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('veto:updater:quit-and-install', () => {
    setImmediate(() => {
      autoUpdater.quitAndInstall()
    })
    return { success: true }
  })

  ipcMain.handle('veto:updater:get-version', () => {
    return app.getVersion()
  })
}
