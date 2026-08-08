import { writable, get } from 'svelte/store'
import { bootstrapStore, saveToStore } from './store-bridge'

// ─── 类型 ──────────────────────────────────────────────────────────────

export interface AuthState {
  offline: boolean
  isLoggedIn: boolean
}

// ─── 默认值 ────────────────────────────────────────────────────────────

const DEFAULTS: AuthState = {
  offline: false,
  isLoggedIn: false,
}

// ─── Store ─────────────────────────────────────────────────────────────

function createAuthStore() {
  const store = writable<AuthState>({ ...DEFAULTS })
  const { subscribe, set, update } = store

  // 从 localStorage / 文件恢复
  bootstrapStore<AuthState>("auth", DEFAULTS).then((data) => {
    set(data)
  })

  return {
    subscribe,
    setOffline(value: boolean) {
      update((state) => {
        const next = { ...state, offline: value, isLoggedIn: value }
        saveToStore("auth", next)
        return next
      })
    },
    isOffline(): boolean {
      return get(store).offline
    },
    isLoggedIn(): boolean {
      return get(store).isLoggedIn
    },
  }
}

export const authStore = createAuthStore()

// 便捷方法（给非组件场景用）
export function setOffline(value: boolean): void {
  authStore.setOffline(value)
}

export function isOffline(): boolean {
  return authStore.isOffline()
}

export function isLoggedIn(): boolean {
  return authStore.isLoggedIn()
}
