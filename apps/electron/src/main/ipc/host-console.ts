/**
 * Local Host Console IPC boundary.
 *
 * This deliberately exposes only lifecycle, recovery, and audit operations.
 * Business content commands are accepted exclusively by HostRuntime through a
 * Seat-authenticated UserClient WebSocket session.
 */

import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import type { HostRuntime } from '../host-runtime'

export interface HostConsoleIpcDependencies {
  runtime: HostRuntime
  /** The primary renderer is the local Host Console. */
  getHostConsoleWindow: () => BrowserWindow | null
  onConferenceChanged?: () => void
  refreshConfiguredConferences?: () => void
}

function isHostConsoleEvent(
  event: IpcMainInvokeEvent,
  getHostConsoleWindow: () => BrowserWindow | null
): boolean {
  const window = getHostConsoleWindow()
  return Boolean(window && !window.isDestroyed() && event.sender.id === window.webContents.id)
}

function forbidden(): { ok: false; error: string } {
  return { ok: false, error: '仅本机 Host Console 可以执行此操作' }
}

/** Register the intentionally small local-only Host Console API. */
export function registerHostConsoleIpc(deps: HostConsoleIpcDependencies): void {
  ipcMain.handle('veto:host-console:status', (event) => {
    if (!isHostConsoleEvent(event, deps.getHostConsoleWindow)) return forbidden()
    deps.refreshConfiguredConferences?.()
    return {
      ok: true,
      activeConferenceId: deps.runtime.activeConference?.id ?? null,
      conferences: deps.runtime.listConfiguredConferences()
    }
  })

  ipcMain.handle('veto:host-console:start-conference', (event, conferenceId: string) => {
    if (!isHostConsoleEvent(event, deps.getHostConsoleWindow)) return forbidden()
    deps.refreshConfiguredConferences?.()
    const result = deps.runtime.startConference(conferenceId)
    if (result.ok) deps.onConferenceChanged?.()
    return result
  })

  ipcMain.handle('veto:host-console:stop-conference', (event) => {
    if (!isHostConsoleEvent(event, deps.getHostConsoleWindow)) return forbidden()
    const result = deps.runtime.stopConference()
    if (result.ok) deps.onConferenceChanged?.()
    return result
  })

  ipcMain.handle(
    'veto:host-console:release-directive-claim',
    (event, directiveId: string, reason: string) => {
      if (!isHostConsoleEvent(event, deps.getHostConsoleWindow)) return forbidden()
      return deps.runtime.execute(
        { kind: 'host_console' },
        {
          requestId: crypto.randomUUID(),
          command: { type: 'release_directive_claim', directiveId, reason }
        }
      )
    }
  )

  ipcMain.handle('veto:host-console:audit-log', (event) => {
    if (!isHostConsoleEvent(event, deps.getHostConsoleWindow)) return forbidden()
    return { ok: true, entries: deps.runtime.getAuditLog() }
  })
}
