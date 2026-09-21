import type { VetoAPI } from '../../electron/src/preload/index'

declare global {
  const __APP_VERSION__: string
  const __APP_BUILD_TIME__: string

  interface Window {
    veto?: VetoAPI
    electron: {
      ipcRenderer: {
        send: (channel: string, ...args: unknown[]) => void
      }
    }
  }
}

export {}
