/**
 * 轻量级客户端路由 —— 替代 SvelteKit 的 $app/* API。
 *
 * 用法：
 *   import { currentRoute, navigate, setRouteError } from '$lib/router.svelte';
 *
 * 统一使用 hash 路由（#/path），兼容 Electron dev / build / file:// 协议。
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
  const hash = url.hash.replace(/^#/, '') // 去除开头的 #
  const params: Record<string, string> = {}
  let routeId = '/'

  // 统一使用 hash 路由（兼容 file:// / http://）
  const actualPath = hash || pathname

  // /conference-display/<id>
  const conferenceDisplayMatch = actualPath.match(/^\/conference-display\/([\w-]+)$/)
  if (conferenceDisplayMatch) {
    params.conference_id = conferenceDisplayMatch[1]!
    routeId = '/conference-display/[conference_id]'
    return { url, pathname, params, routeId }
  }

  // /battle/<id>/settings
  const battleSettingsMatch = actualPath.match(/^\/battle\/([\w-]+)\/settings/)
  if (battleSettingsMatch) {
    params.battle_id = battleSettingsMatch[1]!
    routeId = '/battle/[battle_id]/settings'
  }
  // /battle/<id>
  const battleMatch = actualPath.match(/^\/battle\/([\w-]+)$/)
  if (battleMatch) {
    params.battle_id = battleMatch[1]!
    routeId = '/battle/[battle_id]'
  }
  // /conference/<id>/roll-call
  const conferenceRollCallMatch = actualPath.match(/^\/conference\/([\w-]+)\/roll-call$/)
  if (conferenceRollCallMatch) {
    params.conference_id = conferenceRollCallMatch[1]!
    routeId = '/conference/[conference_id]/roll-call'
  }
  // /conference/<id>/motion
  const conferenceMotionMatch = actualPath.match(/^\/conference\/([\w-]+)\/motion$/)
  if (conferenceMotionMatch) {
    params.conference_id = conferenceMotionMatch[1]!
    routeId = '/conference/[conference_id]/motion'
  }
  // /conference/<id>/question
  const conferenceQuestionMatch = actualPath.match(/^\/conference\/([\w-]+)\/question$/)
  if (conferenceQuestionMatch) {
    params.conference_id = conferenceQuestionMatch[1]!
    routeId = '/conference/[conference_id]/question'
  }
  // /conference/<id>/delegations
  const conferenceDelegationsMatch = actualPath.match(/^\/conference\/([\w-]+)\/delegations$/)
  if (conferenceDelegationsMatch) {
    params.conference_id = conferenceDelegationsMatch[1]!
    routeId = '/conference/[conference_id]/delegations'
  }
  // /conference/<id>
  const conferenceMatch = actualPath.match(/^\/conference\/([\w-]+)$/)
  if (conferenceMatch) {
    params.conference_id = conferenceMatch[1]!
    routeId = '/conference/[conference_id]'
  }

  // /settings
  if (actualPath === '/settings') {
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
 * 跳转到指定路径（统一使用 hash 路由）。
 * navigate('/settings') → #/settings
 */
export function navigate(path: string): void {
  const hashPath = path.startsWith('#') ? path : `#${path}`
  history.pushState(null, '', hashPath)
  refreshRoute()
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
  window.addEventListener('hashchange', refreshRoute)
}
