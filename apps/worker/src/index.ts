interface Env {
  ANALYTICS: AnalyticsEngineDataset
}

interface LaunchEvent {
  event: 'app_started'
  version: string
  platform: string
  arch: string
  installationId: string
}

const INSTALLATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function trim(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method !== 'POST' || url.pathname !== '/v1/events') {
      return new Response('Not found', { status: 404 })
    }

    let event: Partial<LaunchEvent>

    try {
      event = await request.json<Partial<LaunchEvent>>()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    const installationId = trim(event.installationId, 36)

    if (
      event.event !== 'app_started' ||
      !INSTALLATION_ID.test(installationId) ||
      typeof event.version !== 'string' ||
      typeof event.platform !== 'string' ||
      typeof event.arch !== 'string'
    ) {
      return new Response('Invalid event', { status: 400 })
    }

    // Analytics Engine columns are positional. Keep this order stable:
    // blob1 = event, blob2 = version, blob3 = platform, blob4 = arch.
    env.ANALYTICS.writeDataPoint({
      indexes: [installationId],
      blobs: [event.event, trim(event.version, 32), trim(event.platform, 32), trim(event.arch, 32)],
      doubles: [1]
    })

    return new Response(null, { status: 204 })
  }
} satisfies ExportedHandler<Env>
