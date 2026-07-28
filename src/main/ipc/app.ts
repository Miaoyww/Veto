/**
 * ipc/app.ts — 应用工具 IPC 处理器
 */

import { ipcMain, BrowserWindow } from 'electron'

export function registerAppIpc(): void {
  ipcMain.handle('veto:app:open-devtools', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      win.webContents.openDevTools({ mode: 'detach' })
      return { success: true }
    }
    return { success: false, error: 'No window found' }
  })
}
