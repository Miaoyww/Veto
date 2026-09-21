const cloudApiBaseUrl = (
  import.meta.env.VITE_CLOUD_API_URL ?? 'https://api.miaoyww.top/v1'
).replace(/\/$/, '')

const CLOUD_SEAT_SESSION_KEY = 'veto.cloud-seat-session'

export type CloudSeatState = 'unclaimed' | 'claimed'

export interface CloudJoinTarget {
  inviteCode: string
  conferenceId: string
  conferenceName: string
  organizer: string
  committeeId: string
  committeeName: string
  committeeType: 'cabinet' | 'mpc' | 'ipc'
  seatId: string
  seatName: string
  seatShortName: string
  roleTemplateId: string
  roleName: string
  capabilities: string[]
  seatState: CloudSeatState
  hasPassword: boolean
  wsUrl: string
}

export interface CloudClaimInput {
  inviteCode: string
  displayName: string
  password?: string
}

export interface CloudJoinIdentity {
  userId: string
  displayName: string
  conferenceId: string
  committeeId: string
  seatId: string
  roleTemplateId: string
  roleName: string
  capabilities: string[]
}

export interface CloudClaimResult extends CloudJoinTarget {
  token: string
  identity: CloudJoinIdentity
}

export interface CloudSeatSession {
  result: CloudClaimResult
  connectedAt: number
}

export class CloudJoinError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'CloudJoinError'
    this.status = status
  }
}

export function normalizeInviteCode(value: string): string {
  const characters = value.trim().toUpperCase().replaceAll(/[\s-]/g, '')
  if (!/^[A-HJ-NP-Z2-9]{12}$/.test(characters)) {
    throw new CloudJoinError('邀请码格式应为 4-4-4')
  }

  return [characters.slice(0, 4), characters.slice(4, 8), characters.slice(8)].join('-')
}

async function request<T>(path: string, body: unknown): Promise<T> {
  if (!cloudApiBaseUrl) {
    throw new CloudJoinError('云端服务暂未配置')
  }

  let response: Response
  try {
    response = await fetch(new URL(path.replace(/^\//, ''), `${cloudApiBaseUrl}/`), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch {
    throw new CloudJoinError('无法连接云端服务')
  }

  const payload = (await response.json().catch(() => null)) as T | { message?: string } | null
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String(payload.message)
        : '云端服务请求失败'
    throw new CloudJoinError(message, response.status)
  }

  return payload as T
}

export function validateCloudInvite(inviteCode: string): Promise<CloudJoinTarget> {
  return request<CloudJoinTarget>('/veto/join/validate', {
    inviteCode: normalizeInviteCode(inviteCode)
  })
}

export function claimCloudSeat(input: CloudClaimInput): Promise<CloudClaimResult> {
  return request<CloudClaimResult>('/veto/join/claim', {
    ...input,
    inviteCode: normalizeInviteCode(input.inviteCode)
  })
}

export function saveCloudSeatSession(result: CloudClaimResult): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(
    CLOUD_SEAT_SESSION_KEY,
    JSON.stringify({ result, connectedAt: Date.now() } satisfies CloudSeatSession)
  )
}

export function getCloudSeatSession(): CloudSeatSession | null {
  if (typeof sessionStorage === 'undefined') return null

  try {
    const value = JSON.parse(sessionStorage.getItem(CLOUD_SEAT_SESSION_KEY) ?? 'null') as unknown
    if (!value || typeof value !== 'object' || !('result' in value) || !('connectedAt' in value)) {
      return null
    }
    return value as CloudSeatSession
  } catch {
    return null
  }
}
