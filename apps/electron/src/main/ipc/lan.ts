import { ipcMain } from 'electron'
import {
  getLanServerInfo,
  publishLanConference,
  scanLanConferences,
  stopLanConference
} from '../lan-service'

export function registerLanIpc(getPort: () => number): void {
  ipcMain.handle('veto:lan:scan', (_event, timeoutMs?: number) =>
    scanLanConferences(Math.min(Math.max(timeoutMs ?? 1600, 500), 4000))
  )

  ipcMain.handle('veto:lan:get-server-info', () => getLanServerInfo(getPort()))

  ipcMain.handle(
    'veto:lan:publish-conference',
    (_event, info: { conferenceId: string; name: string; phase: string }) => {
      publishLanConference(info, getPort())
      return { success: true }
    }
  )

  ipcMain.handle('veto:lan:unpublish-conference', () => {
    stopLanConference()
    return { success: true }
  })
}
