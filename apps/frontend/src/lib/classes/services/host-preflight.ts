export interface HostStatus {
  activeConferenceId: string | null
  conferences: Array<{ id: string; name: string; active: boolean }>
}

export type HostCheckId = 'console' | 'conference' | 'network'
export type HostCheckState = 'pending' | 'checking' | 'passed' | 'failed'

interface PreflightOptions {
  conferenceId: string
  readStatus: () => Promise<HostStatus>
  getPort: () => Promise<number>
  fetchHealth: (url: string, signal: AbortSignal) => Promise<unknown>
  signal: AbortSignal
  onCheck: (id: HostCheckId, state: HostCheckState) => void
}

// IPC reads cannot be cancelled, so bound the wait and ignore late results.
async function readWithTimeout<T>(read: () => Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  let timer: ReturnType<typeof setTimeout> | undefined
  let onAbort = () => {}
  try {
    return await Promise.race([
      read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('自检超时，请检查 Host 服务后重试。')), 5000)
        onAbort = () => reject(signal.reason)
        signal.addEventListener('abort', onAbort, { once: true })
      })
    ])
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', onAbort)
  }
}

/** Read-only checks; never starts or stops a conference. */
export async function runHostPreflight(options: PreflightOptions): Promise<HostStatus> {
  const { conferenceId, readStatus, getPort, fetchHealth, signal, onCheck } = options
  const network = new AbortController()
  const cancelNetwork = () => network.abort(signal.reason)
  signal.addEventListener('abort', cancelNetwork, { once: true })
  let current: HostCheckId = 'console'

  try {
    onCheck(current, 'checking')
    const status = await readWithTimeout(readStatus, signal)
    signal.throwIfAborted()
    onCheck(current, 'passed')

    current = 'conference'
    onCheck(current, 'checking')
    if (!status.conferences.some((conference) => conference.id === conferenceId)) {
      throw new Error('Host 尚未载入当前大会，请保存大会配置后重试。')
    }
    onCheck(current, 'passed')

    current = 'network'
    onCheck(current, 'checking')
    await readWithTimeout(async () => {
      const port = await getPort()
      signal.throwIfAborted()
      network.signal.throwIfAborted()
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('局域网服务尚未监听端口，请重启 Host 后重试。')
      }
      const health = (await fetchHealth(
        `http://127.0.0.1:${port}/__veto/health`,
        network.signal
      )) as { status?: string; server?: string } | null
      if (health?.status !== 'ok' || health.server !== 'veto.lan') {
        throw new Error('局域网服务响应异常，请检查 Host 后重试。')
      }
    }, signal)
    signal.throwIfAborted()
    onCheck(current, 'passed')
    return status
  } catch (error) {
    if (!signal.aborted) onCheck(current, 'failed')
    throw error
  } finally {
    network.abort()
    signal.removeEventListener('abort', cancelNetwork)
  }
}
