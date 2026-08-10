/**
 * api-client.ts
 * ──────────────────────────────────────────────
 * VetoServer HTTP 客户端。
 *
 * 端点:
 *   POST /auth/send-code     — 发送验证码
 *   POST /auth/verify-code   — 校验验证码，返回 regToken
 *   POST /auth/register      — 消费 regToken + 密码，返回 Token
 *   POST /auth/login         — 邮箱 + 密码登录，返回 Token
 *   GET  /health             — 健康检查
 */

// ─── 配置 ────────────────────────────────────────────────────────────

const BASE_URL = 'http://127.0.0.1:3000'

// ─── 类型 ────────────────────────────────────────────────────────────

export interface SendCodeResponse {
  ok: true
}

export interface VerifyCodeResponse {
  ok: true
  regToken: string
}

export interface RegisterResponse {
  ok: true
  token: string
}

export interface LoginResponse {
  ok: true
  token: string
}

export interface User {
  id: string
  email: string
  name: string
  avatar: string
  created_at: string
}

export interface MeResponse {
  ok: true
  user: {
    name: string
    email: string
    avatar: string
  }
}

// ─── Token 管理 ─────────────────────────────────────────────────────

let cachedToken: string | null = null

export function getToken(): string | null {
  if (cachedToken) return cachedToken
  if (typeof localStorage !== 'undefined') {
    cachedToken = localStorage.getItem('veto_token')
  }
  return cachedToken
}

export function setToken(token: string): void {
  cachedToken = token
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('veto_token', token)
  }
}

export function clearToken(): void {
  cachedToken = null
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('veto_token')
  }
}

// ─── 底层请求 ───────────────────────────────────────────────────────

class ApiErrorResponse extends Error {
  code: number
  constructor(message: string, code: number) {
    super(message)
    this.name = 'ApiErrorResponse'
    this.code = code
  }
}

async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new ApiErrorResponse(data.error ?? `请求失败 (${res.status})`, res.status)
  }

  return data as T
}

// ─── 公开端点 ───────────────────────────────────────────────────────

/** 发送 6 位验证码到指定邮箱 */
export async function sendVerificationCode(email: string): Promise<SendCodeResponse> {
  return request<SendCodeResponse>('/auth/send-code', { email })
}

/** 校验验证码，返回 regToken（注册令牌，5 分钟有效，一次性使用） */
export async function verifyCode(email: string, code: string): Promise<VerifyCodeResponse> {
  return request<VerifyCodeResponse>('/auth/verify-code', { email, code })
}

/** 使用 regToken + 密码完成注册，可选 name 和 avatar（Base64），返回认证 Token */
export async function register(
  regToken: string,
  password: string,
  name?: string,
  avatar?: string
): Promise<RegisterResponse> {
  const body: Record<string, unknown> = { regToken, password }
  if (name) body.name = name
  if (avatar) body.avatar = avatar
  const result = await request<RegisterResponse>('/auth/register', body)
  setToken(result.token)
  return result
}

/** 邮箱 + 密码登录，返回认证 Token */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const result = await request<LoginResponse>('/auth/login', { email, password })
  setToken(result.token)
  return result
}

/** 获取当前登录用户信息 */
export async function getMe(): Promise<MeResponse> {
  return request<MeResponse>('/auth/me')
}

/** 健康检查 */
export async function healthCheck(): Promise<{ status: string }> {
  return request('/health')
}

/** 带认证的 GET 请求（预留） */
export async function authedGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

/** 带认证的 POST 请求（预留） */
export async function authedPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return request<T>(path, body)
}
