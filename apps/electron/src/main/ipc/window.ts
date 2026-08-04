/**
 * ipc/window.ts — 窗口控制 IPC 处理器
 *
 * 提供窗口最小化/最大化/关闭命令。
 * 由 Renderer 进程通过 preload 调用。
 */

import { ipcMain, BrowserWindow } from 'electron'

export function registerWindowIpc(): void {
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
}
