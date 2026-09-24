import { bootstrapStore } from '../helpers/store-bridge'
import { isElectron } from '../utils/runtime'

const endpoint = import.meta.env.VITE_USAGE_ENDPOINT ?? 'https://api.miaoyww.top/v1/event'
const ingestKey = import.meta.env.VITE_USAGE_INGEST_KEY ?? '34da52216c7243248407dc283eddf0a5'
const installationIdKey = 'veto_web_installation_id'
const installationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function getOrCreateWebInstallationId(storage: Storage): string {
  const existing = storage.getItem(installationIdKey)
  if (existing && installationIdPattern.test(existing)) return existing

  const installationId = crypto.randomUUID()
  storage.setItem(installationIdKey, installationId)
  return installationId
}

export async function reportWebLaunchTelemetry(
  appVersion: string,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  if (isElectron() || typeof window === 'undefined' || !endpoint || !ingestKey) return false

  const settings = await bootstrapStore<{ usageAnalyticsEnabled?: boolean }>('settings', {
    usageAnalyticsEnabled: true
  })
  if (settings.usageAnalyticsEnabled === false) return false

  const payload = {
    event: 'app_open',
    install_id: getOrCreateWebInstallationId(window.localStorage),
    app_version: appVersion,
    platform: 'web'
  }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ingest-key': ingestKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
    if (!response.ok) console.warn('Anonymous usage telemetry was rejected:', response.status)
    return response.ok
  } finally {
    clearTimeout(timeoutId)
  }
}

let scheduled = false

/** Report one browser launch event per page load; Electron reports from its main process. */
export function scheduleWebLaunchTelemetry(appVersion: string): void {
  if (scheduled || isElectron() || typeof window === 'undefined') return
  scheduled = true
  void reportWebLaunchTelemetry(appVersion).catch((error) => {
    console.warn('Anonymous usage telemetry failed:', error)
  })
}
