/**
 * cross-window-sync.ts
 * ──────────────────────────────
 * 通用的跨窗口状态同步工具。
 *
 * 原理：Electron 多窗口共享 localStorage，通过 `storage` 事件
 * 实现窗口间状态同步。当窗口 A 写入 localStorage 时，窗口 B
 * 收到事件并更新本地 store。
 *
 * 用法：
 *   import { writable } from 'svelte/store'
 *   const store = writable(defaults)
 *   const unsub = syncAcrossWindows(store, 'veto_my_key')
 *   onDestroy(unsub)
 */

import type { Writable } from 'svelte/store'

/**
 * 建立跨窗口状态同步。
 * @param store  需要同步的 writable store
 * @param storageKey  localStorage 键名
 * @returns 取消监听的 cleanup 函数
 */
export function syncAcrossWindows<T>(store: Writable<T>, storageKey: string): () => void {
  if (typeof window === 'undefined') return () => {}

  function onStorage(e: StorageEvent): void {
    if (e.key === storageKey && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as T
        store.set(parsed)
      } catch {
        /* 忽略无效 JSON */
      }
    }
  }

  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
