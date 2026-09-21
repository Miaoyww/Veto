import { afterEach, describe, expect, it, vi } from 'vitest'

describe('getCloudChairCommittee', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('preserves the API base path when requesting the chair projection', async () => {
    vi.stubEnv('VITE_CLOUD_API_URL', 'https://cloud.example.test/api/v1')
    vi.resetModules()
    const { getCloudChairCommittee } = await import('./cloud-join-client')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          conference: { id: 'conference-1', name: 'Conference', organizer: 'Organizer' },
          committee: { id: 'committee-1', name: 'Committee', type: 'cabinet' },
          chairSeat: {
            id: 'chair-1',
            name: 'Chair',
            roleTemplateId: 'role-1',
            roleName: 'Chair',
            capabilities: ['control_conference'],
            user: null
          },
          seats: []
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    await getCloudChairCommittee('token')

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://cloud.example.test/api/v1/veto/chair/committee'
    )
  })
})
