import { listFileNotifications, type FileNotification } from '$lib/classes/clients/cloud-file-client'

class FileNotificationStore {
  latest = $state<FileNotification | null>(null)
  revision = $state(0)

  dismiss(): void {
    this.latest = null
  }

  connect(token: string, wsUrl: string, conferenceId: string, seatId: string): () => void {
    this.latest = null
    const key = `veto.file-notifications:${conferenceId}:${seatId}`
    const stored = Number(localStorage.getItem(key) ?? '0')
    let cursor = Number.isSafeInteger(stored) && stored >= 0 ? stored : 0
    let socket: WebSocket | null = null
    let retry: number | null = null
    let active = true
    let syncing = false
    let queued = false

    const sync = async (): Promise<void> => {
      if (!active) return
      if (syncing) { queued = true; return }
      syncing = true
      try {
        for (let page = 0; page < 10; page++) {
          const result = await listFileNotifications(token, cursor)
          if (!active || !result.notifications.length) break
          cursor = result.nextCursor
          localStorage.setItem(key, String(cursor))
          this.latest = result.notifications.at(-1) ?? null
          this.revision += 1
          if (result.notifications.length < 200) break
        }
      } catch {
        // The next WebSocket event or periodic check will retry the durable feed.
      } finally {
        syncing = false
        if (queued && active) {
          queued = false
          void sync()
        }
      }
    }

    const open = (): void => {
      if (!active || !wsUrl) return
      socket = new WebSocket(wsUrl, ['veto', `token.${token}`])
      socket.onopen = () => { void sync() }
      socket.onmessage = () => { void sync() }
      socket.onclose = () => {
        if (active) retry = window.setTimeout(open, 5000)
      }
      socket.onerror = () => socket?.close()
    }

    void sync()
    open()
    const interval = window.setInterval(() => void sync(), 30_000)
    return () => {
      active = false
      this.latest = null
      window.clearInterval(interval)
      if (retry !== null) window.clearTimeout(retry)
      socket?.close()
    }
  }
}

export const fileNotifications = new FileNotificationStore()
