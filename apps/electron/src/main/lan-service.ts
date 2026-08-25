import { app } from 'electron'
import { networkInterfaces } from 'os'
import { Bonjour, type Service } from 'bonjour-service'
import { createLogger } from './logger'

const log = createLogger('LanService')

const DEFAULT_CONFERENCE_PORT = 19527

export interface LanConferenceInfo {
  conferenceId: string
  name: string
  phase: string
}

export interface DiscoveredLanConference {
  conferenceId: string
  name: string
  phase: string
  host: string
  port: number
  url: string
  wsUrl: string
  appVersion: string
}

export interface LanServerInfo {
  port: number
  addresses: string[]
  urls: string[]
}

let bonjour: Bonjour | null = null
let advertisedService: Service | null = null
let advertisedConference: LanConferenceInfo | null = null
let advertisementKey = ''

function getBonjour(): Bonjour {
  if (!bonjour) bonjour = new Bonjour()
  return bonjour
}

function isPrivateIpv4(address: string): boolean {
  return (
    address.startsWith('192.168.') ||
    address.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  )
}

export function getLanAddresses(): string[] {
  const addresses: string[] = []
  for (const interfaces of Object.values(networkInterfaces())) {
    for (const item of interfaces ?? []) {
      if (item.family === 'IPv4' && !item.internal && isPrivateIpv4(item.address)) {
        addresses.push(item.address)
      }
    }
  }
  return [...new Set(addresses)]
}

export function getLanServerInfo(port: number): LanServerInfo {
  const addresses = getLanAddresses()
  return {
    port,
    addresses,
    urls: addresses.map((address) => `http://${address}:${port}`)
  }
}

export function getAdvertisedConference(): LanConferenceInfo | null {
  return advertisedConference ? { ...advertisedConference } : null
}

export async function queryLanConference(address: string): Promise<DiscoveredLanConference | null> {
  const trimmed = address.trim()
  if (!trimmed) return null

  const withHttpScheme = /^wss?:\/\//i.test(trimmed)
    ? trimmed.replace(/^ws/i, 'http')
    : /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `http://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withHttpScheme)
  } catch {
    throw new Error('invalid lan address')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('unsupported lan address protocol')
  }

  const port = parsed.port ? Number(parsed.port) : DEFAULT_CONFERENCE_PORT
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('invalid lan address port')
  }

  const host = formatHost(parsed.hostname)
  const httpUrl = `http://${host}:${port}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)

  try {
    const response = await fetch(`${httpUrl}/__veto/health`, {
      cache: 'no-store',
      signal: controller.signal
    })
    if (!response.ok) throw new Error('conference health check failed')

    const health = (await response.json()) as {
      server?: string
      conference?: LanConferenceInfo | null
    }
    if (health.server !== 'veto.lan' || !health.conference) return null

    return {
      ...health.conference,
      host: parsed.hostname,
      port,
      url: httpUrl,
      wsUrl: `ws://${host}:${port}`,
      appVersion: 'unknown'
    }
  } finally {
    clearTimeout(timeout)
  }
}

export function publishLanConference(info: LanConferenceInfo, port: number): void {
  const key = [info.conferenceId, info.name, info.phase, port].join('\n')
  if (advertisementKey === key) return

  advertisedConference = { ...info }
  advertisementKey = key
  stopLanConference(false)

  advertisedService = getBonjour().publish({
    name: `Veto - ${info.name}`,
    type: 'veto',
    port,
    txt: {
      protocol: '1',
      appVersion: app.getVersion(),
      conferenceId: info.conferenceId,
      conferenceName: info.name,
      phase: info.phase
    }
  })

  log.info(`Advertised conference "${info.name}" on port ${port}`)
}

export function stopLanConference(clearConference = true): void {
  if (clearConference) {
    advertisedConference = null
    advertisementKey = ''
  }

  if (!advertisedService) return
  advertisedService.stop()
  advertisedService = null
}

function formatHost(host: string): string {
  return host.includes(':') ? `[${host}]` : host
}

export async function scanLanConferences(timeoutMs = 1600): Promise<DiscoveredLanConference[]> {
  const browser = getBonjour().find({ type: 'veto' })
  const found = new Map<string, DiscoveredLanConference>()

  browser.on('up', (service) => {
    const txt = service.txt as Record<string, string> | undefined
    const conferenceId = txt?.conferenceId
    const name = txt?.conferenceName
    if (!conferenceId || !name || txt?.protocol !== '1') return

    const ipv4 = (service.addresses ?? []).find((address) => /^\d+\.\d+\.\d+\.\d+$/.test(address))
    const host = ipv4 ?? service.host?.replace(/\.$/, '') ?? ''
    if (!host || !service.port) return

    const normalizedHost = formatHost(host)
    const item: DiscoveredLanConference = {
      conferenceId,
      name,
      phase: txt.phase ?? 'unknown',
      host,
      port: service.port,
      url: `http://${normalizedHost}:${service.port}`,
      wsUrl: `ws://${normalizedHost}:${service.port}`,
      appVersion: txt.appVersion ?? 'unknown'
    }
    found.set(`${service.fqdn}:${conferenceId}`, item)
  })

  await new Promise((resolve) => setTimeout(resolve, timeoutMs))
  browser.stop()
  return [...found.values()]
}
