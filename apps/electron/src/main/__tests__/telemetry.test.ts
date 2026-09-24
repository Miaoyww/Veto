import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

vi.mock('../logger')

import { getOrCreateInstallationId, sendLaunchTelemetry, type LaunchTelemetry } from '../telemetry'

const uuid = '01234567-89ab-cdef-0123-456789abcdef'

describe('telemetry', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veto-telemetry-test-'))
  })

  describe('installation ID', () => {
    it('creates and persists a stable random ID', () => {
      const first = getOrCreateInstallationId(tmpDir, () => uuid)
      const second = getOrCreateInstallationId(tmpDir, () => 'should-not-be-called')

      expect(first).toBe(uuid)
      expect(second).toBe(uuid)
      expect(fs.readFileSync(path.join(tmpDir, 'installation-id'), 'utf-8').trim()).toBe(uuid)
    })

    it('replaces malformed IDs', () => {
      fs.writeFileSync(path.join(tmpDir, 'installation-id'), 'not-a-uuid')

      expect(getOrCreateInstallationId(tmpDir, () => uuid)).toBe(uuid)
    })
  })

  describe('launch telemetry', () => {
    const payload: LaunchTelemetry = {
      event: 'app_open',
      install_id: uuid,
      app_version: '0.124.0',
      platform: 'win32'
    }

    it('posts the payload with a JSON content type', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))

      await expect(
        sendLaunchTelemetry('https://api.miaoyww.top/v1/event', 'ingest-key', payload, fetchImpl)
      ).resolves.toBe(true)

      expect(fetchImpl).toHaveBeenCalledWith(
        'https://api.miaoyww.top/v1/event',
        expect.objectContaining({
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-ingest-key': 'ingest-key' },
          body: JSON.stringify(payload)
        })
      )
    })

    it('returns false for HTTP errors', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 500 }))

      await expect(
        sendLaunchTelemetry(
          'https://veto-usage.example.workers.dev/v1/events',
          'ingest-key',
          payload,
          fetchImpl
        )
      ).resolves.toBe(false)
    })
  })
})
