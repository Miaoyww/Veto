import { writable, get } from 'svelte/store'
import { bootstrapStore, saveToStore } from './store-bridge'
import { getToken, setToken, clearToken, getMe } from '$lib/services/api-client'

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
  user: null,
}

// ─── Store ─────────────────────────────────────────────────────────────

function createAuthStore() {
  const store = writable<AuthState>({ ...DEFAULTS })
  const { subscribe, set, update } = store

  // 从 localStorage / 文件恢复
  let initialized = false
  const ready = bootstrapStore<AuthState>('auth', DEFAULTS).then((data) => {
    // 同步 token 到 api-client 的内存缓存
    if (data.token) {
      setToken(data.token)
    }
    set(data)
    initialized = true
  })

  return {
    subscribe,
    ready,

    /** 离线登录（跳过服务端认证） */
    setOffline(value: boolean) {
      update((state) => {
        const next = {
          ...state,
          offline: value,
          isLoggedIn: value,
          token: null,
          user: null,
        }
        saveToStore('auth', next)
        return next
      })
    },

    /** 设置登录状态（token 验证成功后调用） */
    login(token: string, user: AuthUser) {
      setToken(token)
      update((state) => {
        const next = { ...state, isLoggedIn: true, offline: false, token, user }
        saveToStore('auth', next)
        return next
      })
    },

    /** 更新用户信息（注册后设置昵称等） */
    updateUser(user: Partial<AuthUser>) {
      update((state) => {
        if (!state.user) return state
        const next = { ...state, user: { ...state.user, ...user } }
        saveToStore('auth', next)
        return next
      })
    },

    /** 从服务器拉取最新用户信息并更新 Store */
    async refreshUser() {
      try {
        const { user } = await getMe()
        update((state) => {
          if (!state.user) return state
          const next = {
            ...state,
            user: { ...state.user, ...user }
          }
          saveToStore('auth', next)
          return next
        })
      } catch {
        // 获取失败时静默忽略（网络异常等）
      }
    },

    /** 登出 */
    logout() {
      clearToken()
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
      return get(store).token ?? getToken()
    },
    getUser(): AuthUser | null {
      return get(store).user
    },
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
