import { ipcMain } from 'electron'
import { startDisplayWs } from '../display-ws'

export function registerDisplayIpc(): void {
  ipcMain.handle('veto:display:get-port', () => startDisplayWs())
}
