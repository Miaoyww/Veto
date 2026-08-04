import { redirect } from '@sveltejs/kit'
import type { LayoutLoad } from './$types'
import { isLoggedIn } from '$lib/stores/auth-store'

export const ssr = false
export const prerender = false
export const csr = true

export const load: LayoutLoad = ({ url }) => {
  // 已登录则放行
  if (isLoggedIn()) {
    return
  }

  // 避免重定向死循环：如果已经在 /login 页面就不再跳转
  if (url.pathname !== '/login') {
    redirect(302, '/login')
  }
}