/**
 * Host-owned conference domain runtime.
 *
 * This module deliberately has no Electron, WebSocket, or file-system imports.
 * The transport supplies a repository and forwards the small event stream to
 * connected UserClients.  Keeping this boundary pure is what makes the Host
 * Service the sole authority for authorization and content transitions.
 */

import { randomUUID, scryptSync, timingSafeEqual } from 'crypto'
import type {
  AuditActor,
  AuditLogEntry,
  AuthenticatedSeatSession,
  Capability,
  ChairAssignment,
  ChairCommitteeProjection,
  CommitteeRecord,
  Directive,
  News,
  SeatRecord,
  SituationUpdate,
  TimelineProjection,
  UserClientIdentity,
  UserClientSessionProjection,
  WorkflowAudienceProjection
} from '../../../shared/content-types'
import type {
  AuthenticateUserClientCommand,
  HostCommand,
  HostError,
  HostExecuteRequest,
  HostExecuteResult,
  HostQuery
} from '../../../shared/host-protocol'

export interface HostUser {
  id: string
  /** Never included in ordinary UserClient projections. */
  name: string
  passwordHash?: string
  passwordSalt?: string
}

export interface HostSeat extends SeatRecord {
  /** A seat may be deliberately unbound while an event is being configured. */
  userId?: string
  /** Legacy conference data uses this name for procedural metadata. */
  procedure?: SeatRecord['proceduralProfile']
}

export interface HostCommittee extends CommitteeRecord {
  seats: HostSeat[]
}

export interface HostSeatGroup {
  id: string
  type?: string
  defaultCapabilities: Capability[]
}

export interface HostSeatAccess {
  seatId: string
  inviteCode: string
}

/** Persisted Conference-owned data. There is no persisted active conference. */
export interface HostConference {
  id: string
  name: string
  committees: HostCommittee[]
  users: HostUser[]
  seatAccesses: HostSeatAccess[]
  seatGroups?: HostSeatGroup[]
  chairAssignments?: ChairAssignment[]
  timelines?: TimelineProjection[]
  directives: Directive[]
  news: News[]
  situations: SituationUpdate[]
}

export interface IdempotencyRecord {
  conferenceId: string
  seatId: string
  key: string
  /** A stable comparison prevents a key being reused for a different write. */
  fingerprint: string
  value: unknown
  completedAt: number
}

export interface HostRuntimeState {
  version: 1
  conferences: HostConference[]
  auditLog: AuditLogEntry[]
  idempotency: IdempotencyRecord[]
}

/** The only persistence contract needed by the pure runtime. */
export interface HostRuntimeRepository {
  load(): HostRuntimeState | null
  save(state: HostRuntimeState): void
}

export type HostActor = { kind: 'host_console' } | { kind: 'user_client'; sessionId: string }

/** Events intentionally carry only safe public content and session identifiers. */
export type HostRuntimeEvent =
  | {
      type: 'content_changed'
      conferenceId: string
      contentType: 'directive' | 'news' | 'situation'
      content: Directive | News | SituationUpdate
    }
  | {
      type: 'session_revoked'
      sessionId: string
      reason: 'replaced' | 'permissions_changed' | 'conference_switched' | 'host_shutdown'
    }
  | { type: 'projection_changed'; conferenceId: string }

export interface HostRuntimeOptions {
  now?: () => number
  id?: () => string
}

export interface HostAuthentication {
  inviteCode: string
  password?: string
}

export type HostAuthenticationResult =
  | {
      ok: true
      session: AuthenticatedSeatSession
      actor: Extract<HostActor, { kind: 'user_client' }>
    }
  | { ok: false; error: HostError }

type MutationResult =
  | {
      value: unknown
      audit: Omit<AuditLogEntry, 'id' | 'timestamp' | 'conferenceId' | 'actor'>
      event?: HostRuntimeEvent
    }
  | { error: HostError }

const USER_MUTATION_TYPES = new Set<HostCommand['type']>([
  'submit_directive',
  'claim_directive',
  'approve_directive',
  'reject_directive',
  'cancel_directive',
  'submit_news',
  'review_news',
  'withdraw_news',
  'publish_situation',
  'withdraw_situation'
])

const CONSOLE_ONLY_TYPES = new Set<HostCommand['type']>([
  'start_conference',
  'stop_conference',
  'release_directive_claim'
])

function error(code: HostError['code'], message: string, field?: string): HostError {
  return { code, message, ...(field ? { field } : {}) }
}

function failure<T>(
  requestId: string,
  code: HostError['code'],
  message: string,
  field?: string
): HostExecuteResult<T> {
  return { ok: false, requestId, error: error(code, message, field) }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

function equalPassword(password: string, hash: string, salt: string): boolean {
  try {
    const actual = scryptSync(password, Buffer.from(salt, 'hex'), 64)
    const expected = Buffer.from(hash, 'hex')
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/**
 * HostRuntime coordinates multiple configured Conferences while keeping the
 * currently active Conference process-local. A restart therefore begins with
 * no active Conference even though all content and audit records are restored.
 */
export class HostRuntime {
  private state: HostRuntimeState
  private activeConferenceId: string | null = null
  private readonly sessions = new Map<string, AuthenticatedSeatSession>()
  private readonly listeners = new Set<(event: HostRuntimeEvent) => void>()
  private readonly now: () => number
  private readonly id: () => string

  constructor(
    private readonly repository: HostRuntimeRepository,
    options: HostRuntimeOptions = {}
  ) {
    this.state = normalizeHostRuntimeState(repository.load())
    this.now = options.now ?? Date.now
    this.id = options.id ?? randomUUID
  }

  get activeConference(): HostConference | null {
    return this.activeConferenceId == null
      ? null
      : (this.state.conferences.find((conference) => conference.id === this.activeConferenceId) ??
          null)
  }

  get service(): HostConferenceService | null {
    return this.activeConference ? new HostConferenceService(this, this.activeConference.id) : null
  }

  /** Subscribe to safe transport events. */
  subscribe(listener: (event: HostRuntimeEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Explicit lifecycle command for local Host Console use. */
  startConference(conferenceId: string): HostExecuteResult<{ conferenceId: string }> {
    return this.execute(
      { kind: 'host_console' },
      {
        requestId: this.id(),
        command: { type: 'start_conference', conferenceId }
      }
    )
  }

  stopConference(): HostExecuteResult<{ stoppedConferenceId: string | null }> {
    return this.execute(
      { kind: 'host_console' },
      {
        requestId: this.id(),
        command: { type: 'stop_conference' }
      }
    )
  }

  /**
   * Authenticates a Seat into the currently active Conference. A successful
   * authentication always replaces a previous session for the same Seat.
   */
  authenticate(credentials: HostAuthentication): HostAuthenticationResult {
    const conference = this.activeConference
    if (!conference) return { ok: false, error: error('no_active_conference', '没有活动大会') }

    const access = conference.seatAccesses.find(
      (entry) => entry.inviteCode === credentials.inviteCode
    )
    if (!access) return { ok: false, error: error('unauthenticated', '邀请码或密码错误') }

    const found = findSeat(conference, access.seatId)
    if (!found) return { ok: false, error: error('unauthenticated', '席位访问配置无效') }

    const user = found.seat.userId
      ? conference.users.find((candidate) => candidate.id === found.seat.userId)
      : undefined
    if (found.seat.userId && !user) {
      return { ok: false, error: error('unauthenticated', '席位使用者配置无效') }
    }
    if (user?.passwordHash) {
      if (
        !credentials.password ||
        !equalPassword(credentials.password, user.passwordHash, user.passwordSalt ?? '')
      ) {
        return { ok: false, error: error('unauthenticated', '邀请码或密码错误') }
      }
    }

    for (const [sessionId, existing] of this.sessions) {
      if (existing.conferenceId === conference.id && existing.seatId === found.seat.id) {
        this.sessions.delete(sessionId)
        this.emit({ type: 'session_revoked', sessionId, reason: 'replaced' })
      }
    }

    const identity = this.identityFor(conference, found.committee, found.seat)
    const session: AuthenticatedSeatSession = {
      sessionId: this.id(),
      conferenceId: conference.id,
      seatId: found.seat.id,
      identity,
      projection: this.buildProjection(conference, identity),
      chairProjection: this.buildChairProjection(conference, identity),
      connectedAt: this.now()
    }
    this.sessions.set(session.sessionId, session)

    return { ok: true, session, actor: { kind: 'user_client', sessionId: session.sessionId } }
  }

  /** Compatibility overload for the typed protocol authentication command. */
  authenticateCommand(command: AuthenticateUserClientCommand): HostAuthenticationResult {
    return this.authenticate(command)
  }

  disconnect(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  /** Revokes a Seat immediately after Host Console security changes. */
  revokeSeatSession(seatId: string): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.seatId === seatId) {
        this.sessions.delete(sessionId)
        this.emit({ type: 'session_revoked', sessionId, reason: 'permissions_changed' })
      }
    }
  }

  shutdown(): void {
    this.revokeAll('host_shutdown')
    this.activeConferenceId = null
  }

  /** The single authoritative mutation path. */
  execute<T = unknown>(actor: HostActor, request: HostExecuteRequest): HostExecuteResult<T> {
    const command = request.command
    if (command.type === 'authenticate_user_client') {
      return failure(request.requestId, 'invalid_command', '认证必须通过 authenticate 入口')
    }

    if (CONSOLE_ONLY_TYPES.has(command.type) && actor.kind !== 'host_console') {
      return failure(request.requestId, 'forbidden', '该操作仅限 Host Console')
    }
    if (USER_MUTATION_TYPES.has(command.type) && actor.kind !== 'user_client') {
      return failure(request.requestId, 'forbidden', 'Host Console 不能创建或处理业务内容')
    }

    if (command.type === 'start_conference')
      return this.startFromConsole(request) as HostExecuteResult<T>
    if (command.type === 'stop_conference')
      return this.stopFromConsole(request) as HostExecuteResult<T>

    if (command.type === 'release_directive_claim') {
      const conference = this.activeConference
      if (!conference) return failure(request.requestId, 'no_active_conference', '当前大会不可用')
      return this.releaseClaimFromConsole(actor, request, conference) as HostExecuteResult<T>
    }

    const session = this.resolveSession(actor)
    if (!session)
      return failure(
        request.requestId,
        actor.kind === 'user_client' ? 'session_revoked' : 'forbidden',
        '会话无效或已被替换'
      )
    const conference = this.activeConference
    if (!conference || conference.id !== session.conferenceId) {
      return failure(request.requestId, 'no_active_conference', '当前大会不可用')
    }

    if (!USER_MUTATION_TYPES.has(command.type)) {
      return failure(request.requestId, 'invalid_command', '不支持的命令')
    }
    if (!request.idempotencyKey?.trim()) {
      return failure(request.requestId, 'invalid_command', '缺少幂等键', 'idempotencyKey')
    }

    const fingerprint = JSON.stringify(command)
    const existing = this.state.idempotency.find(
      (record) =>
        record.conferenceId === conference.id &&
        record.seatId === session.seatId &&
        record.key === request.idempotencyKey
    )
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return failure(request.requestId, 'duplicate_request', '幂等键已用于不同的命令')
      }
      return {
        ok: true,
        requestId: request.requestId,
        value: clone(existing.value) as T,
        replayed: true
      }
    }

    return this.executeUserMutation<T>(session, request, conference, fingerprint)
  }

  query(
    actor: HostActor,
    query: HostQuery
  ):
    | UserClientSessionProjection
    | WorkflowAudienceProjection
    | ChairCommitteeProjection
    | HostError {
    const session = this.resolveSession(actor)
    if (!session)
      return error(
        actor.kind === 'user_client' ? 'session_revoked' : 'forbidden',
        '会话无效或已被替换'
      )
    const conference = this.activeConference
    if (!conference || conference.id !== session.conferenceId)
      return error('no_active_conference', '当前大会不可用')
    if (query.type === 'session_projection')
      return this.buildProjection(conference, session.identity)
    if (query.type === 'workflow_queue')
      return this.buildWorkflowProjection(conference, session.identity)
    const chair = this.buildChairProjection(conference, session.identity)
    return chair ?? error('forbidden', '当前席位不是该委员会主席')
  }

  getAuditLog(): readonly AuditLogEntry[] {
    return this.state.auditLog.map((entry) => clone(entry))
  }

  /** Host Console uses this list to choose a Conference explicitly after restart. */
  listConfiguredConferences(): Array<{ id: string; name: string; active: boolean }> {
    return this.state.conferences.map((conference) => ({
      id: conference.id,
      name: conference.name,
      active: conference.id === this.activeConferenceId
    }))
  }

  /** Add a newly created local configuration without replacing Host-owned data. */
  registerConfiguredConference(conference: HostConference): void {
    if (this.state.conferences.some((item) => item.id === conference.id)) return
    const candidate = clone(this.state)
    candidate.conferences.push(normalizeConference(conference))
    this.repository.save(candidate)
    this.state = candidate
  }

  /** Exposed for a Host Console data adapter. Callers only receive a copy. */
  snapshot(): HostRuntimeState {
    return clone(this.state)
  }

  private startFromConsole(
    request: HostExecuteRequest
  ): HostExecuteResult<{ conferenceId: string }> {
    const command = request.command
    if (command.type !== 'start_conference')
      return failure(request.requestId, 'invalid_command', '无效的大会启动命令')
    if (!this.state.conferences.some((conference) => conference.id === command.conferenceId)) {
      return failure(request.requestId, 'not_found', '未找到大会')
    }
    if (this.activeConferenceId && this.activeConferenceId !== command.conferenceId)
      this.revokeAll('conference_switched')
    this.activeConferenceId = command.conferenceId
    this.appendAudit({ kind: 'host_console' }, command.conferenceId, {
      action: 'conference_started',
      entityType: 'conference',
      entityId: command.conferenceId
    })
    this.emit({ type: 'projection_changed', conferenceId: command.conferenceId })
    return { ok: true, requestId: request.requestId, value: { conferenceId: command.conferenceId } }
  }

  private stopFromConsole(
    request: HostExecuteRequest
  ): HostExecuteResult<{ stoppedConferenceId: string | null }> {
    const stoppedConferenceId = this.activeConferenceId
    this.revokeAll('conference_switched')
    this.activeConferenceId = null
    this.appendAudit({ kind: 'host_console' }, stoppedConferenceId ?? undefined, {
      action: 'conference_stopped',
      entityType: 'conference',
      entityId: stoppedConferenceId ?? undefined
    })
    return { ok: true, requestId: request.requestId, value: { stoppedConferenceId } }
  }

  private executeUserMutation<T>(
    session: AuthenticatedSeatSession,
    request: HostExecuteRequest,
    conference: HostConference,
    fingerprint: string
  ): HostExecuteResult<T> {
    const candidate = clone(this.state)
    const target = candidate.conferences.find((item) => item.id === conference.id)
    if (!target) return failure(request.requestId, 'not_found', '未找到大会')
    const result = this.applyUserCommand(target, session, request.command)
    if ('error' in result) return { ok: false, requestId: request.requestId, error: result.error }

    const now = this.now()
    const audit: AuditLogEntry = {
      id: this.id(),
      conferenceId: target.id,
      timestamp: now,
      actor: { kind: 'user_client', sessionId: session.sessionId, seatId: session.seatId },
      ...result.audit
    }
    candidate.auditLog.push(audit)
    candidate.idempotency.push({
      conferenceId: target.id,
      seatId: session.seatId,
      key: request.idempotencyKey!,
      fingerprint,
      value: clone(result.value),
      completedAt: now
    })
    this.repository.save(candidate)
    this.state = candidate

    if (result.event) this.emit(result.event)
    this.emit({ type: 'projection_changed', conferenceId: target.id })
    return { ok: true, requestId: request.requestId, value: result.value as T }
  }

  private releaseClaimFromConsole(
    actor: HostActor,
    request: HostExecuteRequest,
    conference: HostConference
  ): HostExecuteResult<Directive> {
    const command = request.command
    if (actor.kind !== 'host_console' || command.type !== 'release_directive_claim') {
      return failure(request.requestId, 'forbidden', '该操作仅限 Host Console')
    }
    if (!hasText(command.reason))
      return failure(request.requestId, 'invalid_command', '必须填写释放原因', 'reason')
    const candidate = clone(this.state)
    const target = candidate.conferences.find((item) => item.id === conference.id)!
    const directive = target.directives.find((item) => item.id === command.directiveId)
    if (!directive) return failure(request.requestId, 'not_found', '未找到指令')
    if (directive.status !== 'processing' || !directive.claimedBySeatId) {
      return failure(request.requestId, 'conflict', '只能释放处理中指令的认领')
    }
    directive.status = 'submitted'
    delete directive.claimedBySeatId
    delete directive.claimedAt
    directive.processingNote = `Host Console released claim: ${command.reason.trim()}`
    directive.updatedAt = this.now()
    candidate.auditLog.push({
      id: this.id(),
      conferenceId: target.id,
      timestamp: this.now(),
      actor: { kind: 'host_console' },
      action: 'directive_claim_released',
      entityType: 'directive',
      entityId: directive.id,
      reason: command.reason.trim()
    })
    this.repository.save(candidate)
    this.state = candidate
    this.emit({
      type: 'content_changed',
      conferenceId: target.id,
      contentType: 'directive',
      content: clone(directive)
    })
    this.emit({ type: 'projection_changed', conferenceId: target.id })
    return { ok: true, requestId: request.requestId, value: clone(directive) }
  }

  private applyUserCommand(
    conference: HostConference,
    session: AuthenticatedSeatSession,
    command: HostCommand
  ): MutationResult {
    const origin = findSeat(conference, session.seatId)
    if (!origin) return { error: error('forbidden', '当前席位已不存在') }
    const timestamp = this.now()
    const author = {
      committeeName: origin.committee.name,
      seatName: origin.seat.name,
      ...(origin.seat.role ? { role: origin.seat.role } : {})
    }
    const requireCapability = (capability: Capability): HostError | null =>
      session.identity.capabilities.includes(capability)
        ? null
        : error('forbidden', '当前席位没有所需权限')
    const requiredText = (value: string, field: string): HostError | null =>
      hasText(value) ? null : error('invalid_command', '该字段不能为空', field)

    if (command.type === 'submit_directive') {
      const denied =
        requireCapability('submit_directive') ??
        requiredText(command.title, 'title') ??
        requiredText(command.content, 'content')
      if (denied) return { error: denied }
      if (!conference.committees.some((committee) => committee.id === command.targetCommitteeId)) {
        return { error: error('not_found', '目标委员会不存在', 'targetCommitteeId') }
      }
      const directive: Directive = {
        id: this.id(),
        conferenceId: conference.id,
        sourceCommitteeId: origin.committee.id,
        sourceSeatId: origin.seat.id,
        targetCommitteeId: command.targetCommitteeId,
        title: command.title.trim(),
        content: command.content.trim(),
        status: 'submitted',
        createdAt: timestamp,
        updatedAt: timestamp,
        author
      }
      conference.directives.push(directive)
      return {
        value: clone(directive),
        audit: { action: 'directive_submitted', entityType: 'directive', entityId: directive.id },
        event: {
          type: 'content_changed',
          conferenceId: conference.id,
          contentType: 'directive',
          content: clone(directive)
        }
      }
    }

    if (command.type === 'claim_directive') {
      const denied = requireCapability('process_directive')
      if (denied) return { error: denied }
      const directive = conference.directives.find((item) => item.id === command.directiveId)
      if (!directive) return { error: error('not_found', '未找到指令') }
      if (directive.targetCommitteeId !== origin.committee.id)
        return { error: error('forbidden', '该指令不属于当前委员会') }
      if (directive.status !== 'submitted')
        return { error: error('conflict', '指令已被认领或已结束') }
      directive.status = 'processing'
      directive.claimedBySeatId = origin.seat.id
      directive.claimedAt = timestamp
      directive.updatedAt = timestamp
      return {
        value: clone(directive),
        audit: { action: 'directive_claimed', entityType: 'directive', entityId: directive.id },
        event: {
          type: 'content_changed',
          conferenceId: conference.id,
          contentType: 'directive',
          content: clone(directive)
        }
      }
    }

    if (command.type === 'approve_directive' || command.type === 'reject_directive') {
      const denied =
        requireCapability('process_directive') ??
        requiredText(command.processingNote, 'processingNote')
      if (denied) return { error: denied }
      const directive = conference.directives.find((item) => item.id === command.directiveId)
      if (!directive) return { error: error('not_found', '未找到指令') }
      if (directive.status !== 'processing' || directive.claimedBySeatId !== origin.seat.id) {
        return { error: error('forbidden', '只有认领者可以处理指令') }
      }
      directive.status = command.type === 'approve_directive' ? 'approved' : 'rejected'
      directive.processingNote = command.processingNote.trim()
      directive.updatedAt = timestamp
      if (directive.status === 'approved') directive.approvedAt = timestamp
      else directive.rejectedAt = timestamp
      return {
        value: clone(directive),
        audit: {
          action: directive.status === 'approved' ? 'directive_approved' : 'directive_rejected',
          entityType: 'directive',
          entityId: directive.id,
          reason: directive.processingNote
        },
        event: {
          type: 'content_changed',
          conferenceId: conference.id,
          contentType: 'directive',
          content: clone(directive)
        }
      }
    }

    if (command.type === 'cancel_directive') {
      const directive = conference.directives.find((item) => item.id === command.directiveId)
      if (!directive) return { error: error('not_found', '未找到指令') }
      if (directive.sourceSeatId !== origin.seat.id)
        return { error: error('forbidden', '只有发送者可以取消指令') }
      if (directive.status !== 'submitted')
        return { error: error('conflict', '只有未认领指令可以取消') }
      directive.status = 'cancelled'
      directive.cancelledAt = timestamp
      directive.cancellationReason = command.reason?.trim()
      directive.updatedAt = timestamp
      return {
        value: clone(directive),
        audit: {
          action: 'directive_cancelled',
          entityType: 'directive',
          entityId: directive.id,
          ...(directive.cancellationReason ? { reason: directive.cancellationReason } : {})
        },
        event: {
          type: 'content_changed',
          conferenceId: conference.id,
          contentType: 'directive',
          content: clone(directive)
        }
      }
    }

    if (command.type === 'submit_news') {
      const denied =
        requireCapability('draft_news') ??
        requiredText(command.title, 'title') ??
        requiredText(command.content, 'content') ??
        requiredText(command.source, 'source')
      if (denied) return { error: denied }
      const news: News = {
        id: this.id(),
        conferenceId: conference.id,
        sourceCommitteeId: origin.committee.id,
        sourceSeatId: origin.seat.id,
        title: command.title.trim(),
        content: command.content.trim(),
        source: command.source.trim(),
        status: 'submitted',
        createdAt: timestamp,
        updatedAt: timestamp,
        author
      }
      conference.news.push(news)
      return {
        value: clone(news),
        audit: { action: 'news_submitted', entityType: 'news', entityId: news.id },
        event: {
          type: 'content_changed',
          conferenceId: conference.id,
          contentType: 'news',
          content: clone(news)
        }
      }
    }

    if (command.type === 'review_news') {
      const denied = requireCapability('review_news')
      if (denied) return { error: denied }
      if (command.decision === 'reject' && !hasText(command.note))
        return { error: error('invalid_command', '驳回新闻必须填写说明', 'note') }
      const news = conference.news.find((item) => item.id === command.newsId)
      if (!news) return { error: error('not_found', '未找到新闻') }
      if (news.status !== 'submitted') return { error: error('conflict', '新闻已被审核') }
      news.status = command.decision === 'publish' ? 'published' : 'rejected'
      news.reviewedBySeatId = origin.seat.id
      news.reviewedAt = timestamp
      news.reviewNote = command.note?.trim()
      news.updatedAt = timestamp
      if (news.status === 'published') news.publishedAt = timestamp
      return {
        value: clone(news),
        audit: {
          action: news.status === 'published' ? 'news_published' : 'news_rejected',
          entityType: 'news',
          entityId: news.id,
          ...(news.reviewNote ? { reason: news.reviewNote } : {})
        },
        event: {
          type: 'content_changed',
          conferenceId: conference.id,
          contentType: 'news',
          content: clone(news)
        }
      }
    }

    if (command.type === 'withdraw_news') {
      const denied = requireCapability('withdraw_news') ?? requiredText(command.reason, 'reason')
      if (denied) return { error: denied }
      const news = conference.news.find((item) => item.id === command.newsId)
      if (!news) return { error: error('not_found', '未找到新闻') }
      if (news.status !== 'published') return { error: error('conflict', '只能撤回已发布新闻') }
      news.status = 'retracted'
      news.retractedAt = timestamp
      news.retractionReason = command.reason.trim()
      news.updatedAt = timestamp
      return {
        value: clone(news),
        audit: {
          action: 'news_withdrawn',
          entityType: 'news',
          entityId: news.id,
          reason: news.retractionReason
        },
        event: {
          type: 'content_changed',
          conferenceId: conference.id,
          contentType: 'news',
          content: clone(news)
        }
      }
    }

    if (command.type === 'publish_situation') {
      const denied =
        requireCapability('publish_situation') ??
        requiredText(command.title, 'title') ??
        requiredText(command.content, 'content')
      if (denied) return { error: denied }
      const timeline = conference.timelines?.find((item) => item.id === command.timelineId)
      if (!timeline) return { error: error('not_found', '时间线不存在', 'timelineId') }
      const situation: SituationUpdate = {
        id: this.id(),
        conferenceId: conference.id,
        sourceCommitteeId: origin.committee.id,
        sourceSeatId: origin.seat.id,
        title: command.title.trim(),
        content: command.content.trim(),
        status: 'published',
        timelineId: timeline.id,
        timeline: clone(timeline),
        ...(command.relatedBattleId ? { relatedBattleId: command.relatedBattleId } : {}),
        ...(command.relatedLocation ? { relatedLocation: clone(command.relatedLocation) } : {}),
        createdAt: timestamp,
        updatedAt: timestamp,
        publishedAt: timestamp,
        author
      }
      conference.situations.push(situation)
      return {
        value: clone(situation),
        audit: { action: 'situation_published', entityType: 'situation', entityId: situation.id },
        event: {
          type: 'content_changed',
          conferenceId: conference.id,
          contentType: 'situation',
          content: clone(situation)
        }
      }
    }

    if (command.type === 'withdraw_situation') {
      const denied =
        requireCapability('withdraw_situation') ?? requiredText(command.reason, 'reason')
      if (denied) return { error: denied }
      const situation = conference.situations.find((item) => item.id === command.situationId)
      if (!situation) return { error: error('not_found', '未找到局势') }
      if (situation.status !== 'published')
        return { error: error('conflict', '只能撤回已发布局势') }
      situation.status = 'retracted'
      situation.retractedAt = timestamp
      situation.retractionReason = command.reason.trim()
      situation.updatedAt = timestamp
      return {
        value: clone(situation),
        audit: {
          action: 'situation_withdrawn',
          entityType: 'situation',
          entityId: situation.id,
          reason: situation.retractionReason
        },
        event: {
          type: 'content_changed',
          conferenceId: conference.id,
          contentType: 'situation',
          content: clone(situation)
        }
      }
    }

    return { error: error('invalid_command', '不支持的命令') }
  }

  private resolveSession(actor: HostActor): AuthenticatedSeatSession | null {
    return actor.kind === 'user_client' ? (this.sessions.get(actor.sessionId) ?? null) : null
  }

  private identityFor(
    conference: HostConference,
    committee: HostCommittee,
    seat: HostSeat
  ): UserClientIdentity {
    return {
      seatId: seat.id,
      seatName: seat.name,
      ...(seat.role ? { role: seat.role } : {}),
      committeeId: committee.id,
      committeeName: committee.name,
      capabilities: resolveCapabilities(conference, committee, seat)
    }
  }

  private buildProjection(
    conference: HostConference,
    identity: UserClientIdentity
  ): UserClientSessionProjection {
    const has = (capability: Capability) => identity.capabilities.includes(capability)
    return {
      conferenceId: conference.id,
      conferenceName: conference.name,
      identity: clone(identity),
      directives: has('view_conference')
        ? conference.directives
            .filter(
              (item) =>
                (item.sourceCommitteeId === identity.committeeId ||
                  item.targetCommitteeId === identity.committeeId) &&
                item.status !== 'cancelled'
            )
            .map(clone)
        : [],
      news: has('view_news')
        ? conference.news.filter((item) => item.status === 'published').map(clone)
        : [],
      situations: has('view_situation')
        ? conference.situations.filter((item) => item.status === 'published').map(clone)
        : [],
      directiveTargets: has('submit_directive')
        ? conference.committees.map((committee) => ({ id: committee.id, name: committee.name }))
        : [],
      timelines: has('publish_situation')
        ? (conference.timelines ?? []).map((timeline) => ({
            id: timeline.id,
            name: timeline.name,
            simulationTime: timeline.simulationTime,
            status: timeline.status
          }))
        : [],
      filesAvailable: false
    }
  }

  private buildWorkflowProjection(
    conference: HostConference,
    identity: UserClientIdentity
  ): WorkflowAudienceProjection {
    return {
      directives: identity.capabilities.includes('process_directive')
        ? conference.directives
            .filter(
              (item) =>
                item.targetCommitteeId === identity.committeeId &&
                (item.status === 'submitted' || item.status === 'processing')
            )
            .map(clone)
        : [],
      news: identity.capabilities.includes('review_news')
        ? conference.news.filter((item) => item.status === 'submitted').map(clone)
        : []
    }
  }

  private buildChairProjection(
    conference: HostConference,
    identity: UserClientIdentity
  ): ChairCommitteeProjection | undefined {
    if (!identity.capabilities.includes('control_conference')) return undefined
    const assignment = conference.chairAssignments?.find((item) => item.seatId === identity.seatId)
    if (!assignment || assignment.committeeId !== identity.committeeId) return undefined
    const committee = conference.committees.find((item) => item.id === assignment.committeeId)
    if (!committee) return undefined
    return {
      conferenceId: conference.id,
      conferenceName: conference.name,
      committee: safeCommittee(committee),
      chairAssignment: clone(assignment),
      seats: committee.seats.map((seat) => {
        const user = seat.userId
          ? conference.users.find((item) => item.id === seat.userId)
          : undefined
        return {
          ...safeSeat(seat),
          ...(user ? { assignedUserName: user.name } : {})
        }
      })
    }
  }

  private appendAudit(
    actor: AuditActor,
    conferenceId: string | undefined,
    entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'conferenceId' | 'actor'>
  ): void {
    const candidate = clone(this.state)
    candidate.auditLog.push({
      id: this.id(),
      timestamp: this.now(),
      actor,
      ...(conferenceId ? { conferenceId } : {}),
      ...entry
    })
    this.repository.save(candidate)
    this.state = candidate
  }

  private revokeAll(
    reason: Extract<HostRuntimeEvent, { type: 'session_revoked' }>['reason']
  ): void {
    for (const sessionId of this.sessions.keys())
      this.emit({ type: 'session_revoked', sessionId, reason })
    this.sessions.clear()
  }

  private emit(event: HostRuntimeEvent): void {
    for (const listener of this.listeners) listener(event)
  }
}

/** A per-active-conference facade used by transport and Host Console adapters. */
export class HostConferenceService {
  constructor(
    private readonly runtime: HostRuntime,
    readonly conferenceId: string
  ) {}

  execute<T = unknown>(actor: HostActor, request: HostExecuteRequest): HostExecuteResult<T> {
    return this.runtime.execute<T>(actor, request)
  }

  query(
    actor: HostActor,
    query: HostQuery
  ):
    | UserClientSessionProjection
    | WorkflowAudienceProjection
    | ChairCommitteeProjection
    | HostError {
    return this.runtime.query(actor, query)
  }
}

function findSeat(
  conference: HostConference,
  seatId: string
): { committee: HostCommittee; seat: HostSeat } | null {
  for (const committee of conference.committees) {
    const seat = committee.seats.find((item) => item.id === seatId)
    if (seat) return { committee, seat }
  }
  return null
}

function resolveCapabilities(
  conference: HostConference,
  committee: HostCommittee,
  seat: HostSeat
): Capability[] {
  const groupId = (seat as HostSeat & { seatGroupId?: string }).seatGroupId
  const inherited = new Set<Capability>(
    committee.defaultCapabilities ??
      conference.seatGroups?.find((group) => group.id === groupId)?.defaultCapabilities ??
      []
  )
  for (const [capability, enabled] of Object.entries(seat.capabilityOverrides ?? {})) {
    if (enabled) inherited.add(capability as Capability)
    else inherited.delete(capability as Capability)
  }
  return [...inherited]
}

function safeSeat(seat: HostSeat): SeatRecord {
  const { userId: _userId, procedure: legacyProcedure, ...safe } = seat
  return {
    ...safe,
    ...(safe.proceduralProfile || !legacyProcedure
      ? {}
      : { proceduralProfile: clone(legacyProcedure) })
  }
}

function safeCommittee(committee: HostCommittee): CommitteeRecord {
  const { seats: _seats, ...safe } = committee
  return clone(safe)
}

/**
 * Normalizes both the new Host schema and existing conference-editor records.
 * Legacy procedure fields are retained only for Chair projections.
 */
export function normalizeHostRuntimeState(
  value: HostRuntimeState | null | undefined
): HostRuntimeState {
  const raw = value && typeof value === 'object' ? value : undefined
  const conferences = Array.isArray(raw?.conferences)
    ? raw.conferences.map(normalizeConference)
    : []
  return {
    version: 1,
    conferences,
    auditLog: Array.isArray(raw?.auditLog) ? clone(raw.auditLog) : [],
    idempotency: Array.isArray(raw?.idempotency) ? clone(raw.idempotency) : []
  }
}

function normalizeConference(raw: HostConference): HostConference {
  const record = raw as HostConference & { situationUpdates?: SituationUpdate[] }
  const seatGroups = Array.isArray(record.seatGroups)
    ? record.seatGroups.map((group) => ({
        id: group.id,
        type: group.type,
        defaultCapabilities: Array.isArray(group.defaultCapabilities)
          ? group.defaultCapabilities
          : []
      }))
    : []
  const committees = Array.isArray(record.committees)
    ? record.committees.map((committee) => ({
        id: committee.id,
        conferenceId: record.id,
        name: committee.name,
        type: committee.type ?? 'cabinet',
        mode: committee.mode,
        defaultCapabilities: committee.defaultCapabilities,
        sortOrder: committee.sortOrder,
        seats: Array.isArray(committee.seats)
          ? committee.seats.map((seat) => ({
              ...seat,
              committeeId: committee.id,
              capabilityOverrides: seat.capabilityOverrides ?? {},
              ...(seat.proceduralProfile || !seat.procedure
                ? {}
                : { proceduralProfile: clone(seat.procedure) })
            }))
          : []
      }))
    : []
  return {
    id: record.id,
    name: record.name,
    committees,
    seatGroups,
    users: Array.isArray(record.users) ? clone(record.users) : [],
    seatAccesses: Array.isArray(record.seatAccesses) ? clone(record.seatAccesses) : [],
    chairAssignments: Array.isArray(record.chairAssignments) ? clone(record.chairAssignments) : [],
    timelines: Array.isArray(record.timelines) ? clone(record.timelines) : [],
    directives: Array.isArray(record.directives) ? clone(record.directives) : [],
    news: Array.isArray(record.news) ? clone(record.news) : [],
    situations: Array.isArray(record.situations)
      ? clone(record.situations)
      : Array.isArray(record.situationUpdates)
        ? clone(record.situationUpdates)
        : []
  }
}
