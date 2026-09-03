import { writable, get } from 'svelte/store'
import { bootstrapStore, saveToStore } from '../helpers/store-bridge'

// ─── 类型 ──────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar: string
  created_at: string
}

export interface AuthState {
  offline: boolean
  isLoggedIn: boolean
  token: string | null
  user: AuthUser | null
}

// ─── 默认值 ────────────────────────────────────────────────────────────

const DEFAULTS: AuthState = {
  offline: false,
  isLoggedIn: false,
  token: null,
  user: null
}

// ─── Store ─────────────────────────────────────────────────────────────

function createAuthStore() {
  const store = writable<AuthState>({ ...DEFAULTS })
  const { subscribe, set, update } = store

  // 从 localStorage / 文件恢复
  const ready = bootstrapStore<AuthState>('auth', DEFAULTS).then((data) => {
    set(data)
  })

  return {
    subscribe,
    ready,

    /** 离线登录（组织者模式，无账号体系） */
    setOffline(value: boolean) {
      update((state) => {
        const next = {
          ...state,
          offline: value,
          isLoggedIn: value,
          token: null,
          user: null
        }
        saveToStore('auth', next)
        return next
      })
    },

    /** 设置登录状态（本地会话） */
    login(token: string, user: AuthUser) {
      update((state) => {
        const next = { ...state, isLoggedIn: true, offline: false, token, user }
        saveToStore('auth', next)
        return next
      })
    },

    /** 更新用户信息（本地持久化） */
    updateUser(partial: Partial<AuthUser>) {
      update((state) => {
        if (!state.user) return state
        // 若传入的 avatar 是纯 Base64，补全为 data URL
        const avatar = partial.avatar
          ? partial.avatar.startsWith('data:')
            ? partial.avatar
            : `data:image/png;base64,${partial.avatar}`
          : state.user.avatar
        const next = { ...state, user: { ...state.user, ...partial, avatar } }
        saveToStore('auth', next)
        return next
      })
    },

    /** 登出 */
    logout() {
      update((state) => {
        const next = { ...DEFAULTS }
        saveToStore('auth', next)
        return next
      })
    },

    /** 同步读取 */
    isOffline(): boolean {
      return get(store).offline
    },
    isLoggedIn(): boolean {
      return get(store).isLoggedIn
    },
    getToken(): string | null {
      return get(store).token
    },
    getUser(): AuthUser | null {
      return get(store).user
    }
  }
}

export const authStore = createAuthStore()

// ─── 便捷方法 ─────────────────────────────────────────────────────────

export function setOffline(value: boolean): void {
  authStore.setOffline(value)
}

export function isOffline(): boolean {
  return authStore.isOffline()
}

export function isLoggedIn(): boolean {
  return authStore.isLoggedIn()
}
