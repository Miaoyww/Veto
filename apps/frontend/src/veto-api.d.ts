import type { VetoAPI } from '../../electron/src/preload/index'

declare global {
  interface Window {
    veto?: VetoAPI
  }
}

export {}
