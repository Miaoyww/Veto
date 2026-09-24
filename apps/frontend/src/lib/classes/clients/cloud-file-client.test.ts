import { afterEach, describe, expect, it, vi } from 'vitest'

describe('cloud file review client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('submits a replacement for review with its requested visibility', async () => {
    vi.stubEnv('VITE_CLOUD_API_URL', 'https://cloud.example.test/api/v1')
    vi.resetModules()
    const { uploadCloudFile } = await import('./cloud-file-client')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      file: { id: 'new-file', status: 'submitted' }
    }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['paper'], 'draft.txt', { type: 'text/plain' })
    const result = await uploadCloudFile('seat-token', file, {
      title: 'Draft', fileType: '工作文件', visibility: 'conference', replacesFileId: 'old-file'
    })

    expect(result.status).toBe('submitted')
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(String(url)).toBe('https://cloud.example.test/api/v1/veto/files')
    const headers = new Headers(init.headers)
    expect(headers.get('X-File-Visibility')).toBe('conference')
    expect(headers.get('X-Replaces-File-Id')).toBe('old-file')
    expect(headers.get('X-File-Type')).toBe(encodeURIComponent('工作文件'))
  })

  it('sends review decisions and reads the author notification feed', async () => {
    vi.stubEnv('VITE_CLOUD_API_URL', 'https://cloud.example.test/api/v1')
    vi.resetModules()
    const { reviewCloudFile, listFileNotifications } = await import('./cloud-file-client')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ file: { id: 'file-1', status: 'rejected' } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ notifications: [], nextCursor: 4 })))
    vi.stubGlobal('fetch', fetchMock)

    await reviewCloudFile('seat-token', 'file-1', 'reject', 'Please revise')
    await listFileNotifications('seat-token', 4)

    expect(String(fetchMock.mock.calls[0][0])).toBe('https://cloud.example.test/api/v1/veto/files/file-1/reject')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ note: 'Please revise' })
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://cloud.example.test/api/v1/veto/files/notifications?after=4')
  })
})
