/**
 * 轻量级客户端路由 —— 替代 SvelteKit 的 $app/* API。
 *
 * 用法：
 *   import { currentRoute, navigate, setRouteError } from '$lib/router.svelte';
 */

// ─── 内部 URL 解析 ──────────────────────────────────────────────────

interface ParsedRoute {
  url: URL
  pathname: string
  params: Record<string, string>
  routeId: string
}

function parseRoute(url: URL): ParsedRoute {
  const pathname = url.pathname
  const params: Record<string, string> = {}
  let routeId = '/'

  // /battle/<id>/settings
  const battleSettingsMatch = pathname.match(/^\/battle\/([\w-]+)\/settings/)
  if (battleSettingsMatch) {
    params.battle_id = battleSettingsMatch[1]!
    routeId = '/battle/[battle_id]/settings'
  }
  // /battle/<id>
  const battleMatch = pathname.match(/^\/battle\/([\w-]+)$/)
  if (battleMatch) {
    params.battle_id = battleMatch[1]!
    routeId = '/battle/[battle_id]'
  }
  // /settings
  if (pathname === '/settings') {
    routeId = '/settings'
  }

  return { url, pathname, params, routeId }
}

// ─── 响应式路由状态 ─────────────────────────────────────────────────

function createRouteState() {
  let _status = $state(200)
  let _error = $state<Error | null>(null)

  const active = $state({
    ...parseRoute(new URL(window.location.href)),
    get status() { return _status },
    get error() { return _error },
    set status(v: number) { _status = v },
    set error(v: Error | null) { _error = v },
  })

  return { active, raw: { get status() { return _status }, get error() { return _error } } }
}

const route = typeof window !== 'undefined'
  ? createRouteState()
  : { active: null as any, raw: { get status() { return 200 }, get error() { return null as Error | null } } }

export const currentRoute = route.active

// ─── API ─────────────────────────────────────────────────────────────

/**
 * 跳转到指定路径（client-side pushState）。
 * 用法和 SvelteKit 的 goto() 一致。
 */
export function navigate(path: string): void {
  history.pushState(null, '', path)
  refreshRoute()
}

/**
 * 手动设置路由错误状态（替代 SvelteKit 的 error(403, msg)）。
 * 错误页面组件读取 currentRoute.status / currentRoute.error 来展示错误信息。
 */
export function setRouteError(status: number, message: string): void {
  route.raw = { ...route.raw, status, error: new Error(message) }
}

/** 清除错误状态，恢复为 200 */
export function clearRouteError(): void {
  route.raw = { ...route.raw, status: 200, error: null }
}

// ─── 内部 ────────────────────────────────────────────────────────────

function refreshRoute(): void {
  const parsed = parseRoute(new URL(window.location.href))
  currentRoute.url = parsed.url
  currentRoute.pathname = parsed.pathname
  currentRoute.params = parsed.params
  currentRoute.routeId = parsed.routeId
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', refreshRoute)
}
