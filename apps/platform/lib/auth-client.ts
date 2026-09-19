const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "")

export class AuthError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "AuthError"
    this.status = status
  }
}

async function request<T>(path: string, body: unknown): Promise<T> {
  if (!apiBaseUrl) {
    throw new AuthError("API 服务暂未配置")
  }

  let response: Response
  try {
    response = await fetch(new URL(path.replace(/^\//, ""), `${apiBaseUrl}/`), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AuthError("无法连接认证服务")
  }

  const payload = (await response.json().catch(() => null)) as
    | (T & { ok?: boolean; error?: string })
    | { ok?: boolean; error?: string }
    | null

  if (!response.ok || payload?.ok === false) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload && payload.error
        ? String(payload.error)
        : "请求失败"
    throw new AuthError(message, response.status)
  }

  return payload as T
}

export async function login(email: string, password: string): Promise<string> {
  const result = await request<{ ok: true; token: string }>("/v1/auth/login", {
    email,
    password,
  })
  return result.token
}

export async function sendVerificationCode(email: string): Promise<void> {
  await request<{ ok: true }>("/v1/auth/send-code", { email })
}

export async function verifyCode(
  email: string,
  code: string
): Promise<string> {
  const result = await request<{ ok: true; regToken: string }>(
    "/v1/auth/verify-code",
    { email, code }
  )
  return result.regToken
}

export async function register(
  regToken: string,
  password: string,
  name?: string
): Promise<string> {
  const result = await request<{ ok: true; token: string }>("/v1/auth/register", {
    regToken,
    password,
    name: name?.trim() || undefined,
  })
  return result.token
}
