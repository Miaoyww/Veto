type RuntimeGlobals = typeof globalThis & {
  process?: {
    versions?: {
      electron?: string
    }
  }
}

/** 判断当前代码是否运行在 Electron 环境中。 */
export function isElectron(): boolean {
  const runtime = globalThis as RuntimeGlobals
  const electronVersion = runtime.process?.versions?.electron

  if (typeof electronVersion === 'string' && electronVersion.length > 0) {
    return true
  }

  if (typeof window === 'undefined') {
    return false
  }

  return typeof window.electron === 'object' && window.electron !== null
}
