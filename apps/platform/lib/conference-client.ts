const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "")

export const CAPABILITIES = [
  "view_conference",
  "view_news",
  "view_situation",
  "view_files",
  "draft_news",
  "review_news",
  "submit_directive",
  "process_directive",
  "send_files",
  "publish_situation",
  "withdraw_news",
  "withdraw_situation",
  "withdraw_files",
  "control_conference",
  "draft_resolution",
] as const

export type Capability = (typeof CAPABILITIES)[number]
export type CommitteeType = "cabinet" | "mpc" | "ipc"
export type SystemRoleCode = "staff" | "mpc_press" | "ipc"

export const CAPABILITY_LABELS: Record<Capability, string> = {
  view_conference: "查看会议状态",
  view_news: "查看全局新闻",
  view_situation: "查看全局局势",
  view_files: "查看文件",
  draft_news: "起草新闻草稿",
  review_news: "审核新闻",
  submit_directive: "提交指令",
  process_directive: "处理指令",
  send_files: "发送文件",
  publish_situation: "发布局势更新",
  withdraw_news: "撤回新闻",
  withdraw_situation: "撤回局势更新",
  withdraw_files: "撤回文件",
  control_conference: "控制会议流程",
  draft_resolution: "起草决议",
}

export interface ConferenceSummary {
  id: string
  mode: "conference"
  name: string
  description?: string
  organizer?: string
  version: number
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface RoleTemplateInput {
  id?: string
  clientId?: string
  name: string
  description?: string
  systemCode?: SystemRoleCode
  capabilities: Capability[]
  builtIn?: boolean
}

export interface SeatInput {
  id?: string
  clientId?: string
  name: string
  shortName?: string
  roleTemplateId: string
  hasVotingRights: boolean
  inviteCode?: string
  inviteActive?: boolean
}

export interface AgendaItemInput {
  id?: string
  clientId?: string
  title: string
  description?: string
}

export interface CommitteeInput {
  id?: string
  clientId?: string
  name: string
  type: CommitteeType
  seats: SeatInput[]
  agenda: AgendaItemInput[]
}

export interface Conference extends ConferenceSummary {
  roleTemplates: RoleTemplateInput[]
  committees: CommitteeInput[]
}

export interface ConferenceStructure {
  roleTemplates: RoleTemplateInput[]
  committees: CommitteeInput[]
}

export interface CreateConferenceInput extends ConferenceStructure {
  name: string
  description?: string
  organizer?: string
}

interface ApiFieldError {
  path: string
  code: string
  message: string
}

interface ApiErrorBody {
  ok: false
  error: {
    code: string
    message: string
    fields?: ApiFieldError[]
  }
}

export class ConferenceApiError extends Error {
  readonly status?: number
  readonly code?: string
  readonly fields: ApiFieldError[]

  constructor(
    message: string,
    options: { status?: number; code?: string; fields?: ApiFieldError[] } = {}
  ) {
    super(message)
    this.name = "ConferenceApiError"
    this.status = options.status
    this.code = options.code
    this.fields = options.fields ?? []
  }
}

async function apiRequest<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!apiBaseUrl) {
    throw new ConferenceApiError("API 服务暂未配置")
  }

  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${token}`)
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  let response: Response
  try {
    response = await fetch(new URL(path.replace(/^\//, ""), `${apiBaseUrl}/`), {
      ...init,
      headers,
    })
  } catch {
    throw new ConferenceApiError("无法连接大会服务")
  }

  const payload = (await response.json().catch(() => null)) as
    T | ApiErrorBody | null

  if (!response.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error
        : undefined
    throw new ConferenceApiError(error?.message ?? "请求失败", {
      status: response.status,
      code: error?.code,
      fields: error?.fields,
    })
  }

  return payload as T
}

export async function listConferences(
  token: string,
  options: {
    status?: "active" | "deleted"
    cursor?: string
    limit?: number
  } = {}
): Promise<{ conferences: ConferenceSummary[]; nextCursor: string | null }> {
  const query = new URLSearchParams({
    status: options.status ?? "active",
    limit: String(options.limit ?? 20),
  })
  if (options.cursor) query.set("cursor", options.cursor)
  return apiRequest(token, `/v1/conferences?${query}`)
}

export async function getConference(
  token: string,
  id: string
): Promise<Conference> {
  const result = await apiRequest<{ ok: true; conference: Conference }>(
    token,
    `/v1/conferences/${encodeURIComponent(id)}`
  )
  return result.conference
}

export async function createConference(
  token: string,
  input: CreateConferenceInput,
  idempotencyKey: string
): Promise<Conference> {
  const result = await apiRequest<{ ok: true; conference: Conference }>(
    token,
    "/v1/conferences",
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(input),
    }
  )
  return result.conference
}

export async function updateConferenceMetadata(
  token: string,
  id: string,
  version: number,
  input: { name?: string; description?: string; organizer?: string }
): Promise<Conference> {
  const result = await apiRequest<{ ok: true; conference: Conference }>(
    token,
    `/v1/conferences/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "If-Match": `"${version}"` },
      body: JSON.stringify(input),
    }
  )
  return result.conference
}

export async function replaceConferenceStructure(
  token: string,
  id: string,
  version: number,
  structure: ConferenceStructure
): Promise<Conference> {
  const result = await apiRequest<{ ok: true; conference: Conference }>(
    token,
    `/v1/conferences/${encodeURIComponent(id)}/structure`,
    {
      method: "PUT",
      headers: { "If-Match": `"${version}"` },
      body: JSON.stringify(structure),
    }
  )
  return result.conference
}

export async function deleteConference(
  token: string,
  id: string,
  version: number
): Promise<void> {
  await apiRequest(token, `/v1/conferences/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "If-Match": `"${version}"` },
  })
}

export async function restoreConference(
  token: string,
  id: string,
  version: number
): Promise<Conference> {
  const result = await apiRequest<{ ok: true; conference: Conference }>(
    token,
    `/v1/conferences/${encodeURIComponent(id)}/restore`,
    {
      method: "POST",
      headers: { "If-Match": `"${version}"` },
    }
  )
  return result.conference
}
