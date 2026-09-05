import { ipcMain } from 'electron'
import {
  getLanServerInfo,
  publishLanConference,
  queryLanConference,
  scanLanConferences,
  stopLanConference
} from '../lan-service'
import type { HostRuntime } from '../host-runtime'

export function registerLanIpc(getPort: () => number, runtime?: HostRuntime): void {
  ipcMain.handle('veto:lan:scan', (_event, timeoutMs?: number) =>
    scanLanConferences(Math.min(Math.max(timeoutMs ?? 1600, 500), 4000))
  )

  ipcMain.handle('veto:lan:get-server-info', () => getLanServerInfo(getPort()))

  ipcMain.handle('veto:lan:query', (_event, address: string) => queryLanConference(address))

  ipcMain.handle(
    'veto:lan:publish-conference',
    () => {
      const active = runtime?.activeConference
      if (!active) {
        stopLanConference()
        return { success: false, error: '当前没有活动大会' }
      }
      publishLanConference({ conferenceId: active.id, name: active.name, phase: 'active' }, getPort())
      return { success: true }
    }
  )

  ipcMain.handle('veto:lan:unpublish-conference', () => {
    stopLanConference()
    return { success: true }
  })
}
