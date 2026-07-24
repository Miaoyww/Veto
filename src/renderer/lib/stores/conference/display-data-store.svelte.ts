/**
 * display-data-store.svelte.ts
 * ──────────────────────────────────────────────
 * Display 窗口的共享数据 store。
 *
 * 主入口 index.svelte 负责连接 WebSocket 并写入数据，
 * 各子路由页面（roll-call、general-debate 等）只读取数据。
 */
import type { ConferenceDisplayData } from '$lib/types-conference'

let _current = $state<ConferenceDisplayData | null>(null)

export const displayData = {
  get current(): ConferenceDisplayData | null {
    return _current
  },
  set current(data: ConferenceDisplayData | null) {
    _current = data
  }
}
