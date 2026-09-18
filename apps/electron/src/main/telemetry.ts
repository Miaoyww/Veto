import { app } from 'electron'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { loadStore } from './data/store'
import { createLogger } from './logger'

const log = createLogger('Telemetry')
const INSTALLATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface LaunchTelemetry {
  event: 'app_started'
  version: string
  platform: string
  arch: string
  installationId: string
}

export function getTelemetryDirectory(): string {
  return path.join(app.getPath('appData'), 'Veto', 'telemetry')
}

export function getOrCreateInstallationId(
  directory: string = getTelemetryDirectory(),
  createId: () => string = randomUUID
): string {
  const filePath = path.join(directory, 'installation-id')

  try {
    const existing = fs.readFileSync(filePath, 'utf-8').trim()
    if (INSTALLATION_ID.test(existing)) return existing
  } catch {
    // First launch or unreadable value: fall through and create a new one.
  }

  const installationId = createId()
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(filePath, `${installationId}\n`, 'utf-8')
  return installationId
}

export function isTelemetryEnabled(): boolean {
  const settings = loadStore<{ usageAnalyticsEnabled?: unknown }>('settings')
  return settings?.usageAnalyticsEnabled !== false
}

export async function sendLaunchTelemetry(
  endpoint: string,
  payload: LaunchTelemetry,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 3000
): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    return response.ok
  } finally {
    clearTimeout(timeoutId)
  }
}

let scheduled = false

function reportLaunch(): void {
  if (!__VETO_TELEMETRY_ENDPOINT__) return

  if (!isTelemetryEnabled()) {
    log.info('Usage telemetry is disabled')
    return
  }

  try {
    const installationId = getOrCreateInstallationId()
    const payload: LaunchTelemetry = {
      event: 'app_started',
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      installationId
    }

    void sendLaunchTelemetry(__VETO_TELEMETRY_ENDPOINT__, payload)
      .then((sent) => {
        if (sent) {
          log.info('Anonymous usage telemetry sent')
        } else {
          log.warn('Anonymous usage telemetry was rejected')
        }
      })
      .catch((error) => {
        log.warn('Anonymous usage telemetry failed:', error)
      })
  } catch (error) {
    log.warn('Could not prepare anonymous usage telemetry:', error)
  }
}

/** Report one anonymous launch event per process. */
export function scheduleLaunchTelemetry(): void {
  if (scheduled) return
  scheduled = true
  reportLaunch()
}
