import { afterEach, describe, expect, it, vi } from 'vitest'
import { isElectron } from './runtime'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('runtime utilities', () => {
  it('returns false outside Electron', () => {
    vi.stubGlobal('window', undefined)

    expect(isElectron()).toBe(false)
  })

  it('detects the Electron renderer bridge', () => {
    vi.stubGlobal('window', { electron: {} })

    expect(isElectron()).toBe(true)
  })

  it('does not treat a normal browser window as Electron', () => {
    vi.stubGlobal('window', {})

    expect(isElectron()).toBe(false)
  })
})
