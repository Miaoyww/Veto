import type { FileContent } from '../../../../../shared/content-types'
export type { FileContent } from '../../../../../shared/content-types'

const apiBase = (import.meta.env.VITE_CLOUD_API_URL ?? 'https://api.miaoyww.top/v1').replace(/\/$/, '')

export class CloudFileError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'CloudFileError'
  }
}

function endpoint(path: string): URL {
  return new URL(path.replace(/^\//, ''), `${apiBase}/`)
}

async function responseError(response: Response, fallback: string): Promise<CloudFileError> {
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null
  return new CloudFileError(payload?.error?.message ?? fallback, response.status)
}

export async function listCloudFiles(token: string): Promise<{ ok: true; files: FileContent[] }> {
  let response: Response
  try {
    response = await fetch(endpoint('/veto/files'), { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    throw new CloudFileError('无法连接云端服务')
  }
  if (!response.ok) throw await responseError(response, '加载文件失败')
  return response.json() as Promise<{ ok: true; files: FileContent[] }>
}

export async function uploadCloudFile(
  token: string,
  file: globalThis.File,
  metadata: { title: string; fileType: string }
): Promise<FileContent> {
  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    'Content-Type': file.type || 'application/octet-stream',
    'X-File-Name': encodeURIComponent(file.name),
    'X-File-Title': encodeURIComponent(metadata.title),
    'X-File-Type': encodeURIComponent(metadata.fileType),
    'X-File-Size': String(file.size)
  })
  let response: Response
  try {
    response = await fetch(endpoint('/veto/files'), { method: 'POST', headers, body: file })
  } catch {
    throw new CloudFileError('无法连接云端服务')
  }
  if (!response.ok) throw await responseError(response, '上传文件失败')
  return (await response.json() as { file: FileContent }).file
}

export async function downloadCloudFile(token: string, item: FileContent): Promise<void> {
  let response: Response
  try {
    response = await fetch(endpoint(`/veto/files/${encodeURIComponent(item.id)}/download`), {
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch {
    throw new CloudFileError('无法连接云端服务')
  }
  if (!response.ok) throw await responseError(response, '下载文件失败')
  const url = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = item.fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function withdrawCloudFile(token: string, id: string, reason: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(endpoint(`/veto/files/${encodeURIComponent(id)}/withdraw`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    })
  } catch {
    throw new CloudFileError('无法连接云端服务')
  }
  if (!response.ok) throw await responseError(response, '撤回文件失败')
}
