import { redirect } from '@sveltejs/kit'
import type { LayoutLoad } from './$types'
import { isLoggedIn } from '$lib/classes/stores/auth-store'

export const ssr = false
export const prerender = false
export const csr = true

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/conference-display/') ||
    pathname.startsWith('/delegate/')
  )
}

export const load: LayoutLoad = ({ url }) => {
  // 已登录则放行
  if (isLoggedIn()) {
    return
  }

  if (!isPublicRoute(url.pathname)) {
    redirect(302, '/login')
  }
}
