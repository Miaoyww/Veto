import { afterEach, describe, expect, it, vi } from 'vitest'
import { getOrCreateWebInstallationId, reportWebLaunchTelemetry } from './web-telemetry'

function makeStorage(): Storage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: (key) => { values.delete(key) },
    clear: () => { values.clear() },
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size }
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('web launch telemetry', () => {
  it('posts a stable browser ID with platform web', async () => {
    const storage = makeStorage()
    vi.stubGlobal('window', { localStorage: storage })
    vi.stubGlobal('localStorage', storage)
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }))

    expect(await reportWebLaunchTelemetry('0.126.0', fetchImpl)).toBe(true)
    const [url, options] = fetchImpl.mock.calls[0]
    const payload = JSON.parse(options.body)
    expect(payload).toEqual({
      event: 'app_open',
      install_id: expect.any(String),
      app_version: '0.126.0',
      platform: 'web'
    })
    expect(options.method).toBe('POST')
    expect(url).toBe('https://api.miaoyww.top/v1/event')
    expect(options.headers['x-ingest-key']).toBeTruthy()
    expect(getOrCreateWebInstallationId(storage)).toBe(payload.install_id)
  })

  it('honors an existing opt-out before creating an ID or posting', async () => {
    const storage = makeStorage()
    storage.setItem('veto_global_settings', JSON.stringify({ usageAnalyticsEnabled: false }))
    vi.stubGlobal('window', { localStorage: storage })
    vi.stubGlobal('localStorage', storage)
    const fetchImpl = vi.fn()

    expect(await reportWebLaunchTelemetry('0.126.0', fetchImpl)).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(storage.getItem('veto_web_installation_id')).toBeNull()
  })

  it('does not duplicate the Electron main-process event', async () => {
    const storage = makeStorage()
    vi.stubGlobal('window', { electron: {}, localStorage: storage })
    vi.stubGlobal('localStorage', storage)
    const fetchImpl = vi.fn()

    expect(await reportWebLaunchTelemetry('0.126.0', fetchImpl)).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
