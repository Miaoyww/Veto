/**
 * ipc/ws.ts — WebSocket 端口查询 IPC 处理器
 */

import { ipcMain } from 'electron'

export function registerWsIpc(getPort: () => number): void {
  ipcMain.handle('veto:ws:get-port', () => getPort())
}
