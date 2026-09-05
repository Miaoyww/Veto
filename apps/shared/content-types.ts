/**
 * Shared Host Service domain contracts.
 *
 * These types are deliberately transport friendly: they contain no Svelte,
 * Electron, or persistence implementation details and can be used by both the
 * Host runtime and a UserClient renderer.
 */

// ---------------------------------------------------------------------------
// Authorization and identities
// ---------------------------------------------------------------------------

/** Capabilities understood by the first Host Service release. */
export type Capability =
  | 'view_conference'
  | 'view_news'
  | 'view_situation'
  | 'view_files'
  | 'draft_news'
  | 'review_news'
  | 'submit_directive'
  | 'process_directive'
  | 'send_files'
  | 'publish_situation'
  | 'withdraw_news'
  | 'withdraw_situation'
  | 'withdraw_files'
  | 'control_conference'
  | 'draft_resolution'

export const CAPABILITIES: readonly Capability[] = [
  'view_conference',
  'view_news',
  'view_situation',
  'view_files',
  'draft_news',
  'review_news',
  'submit_directive',
  'process_directive',
  'send_files',
  'publish_situation',
  'withdraw_news',
  'withdraw_situation',
  'withdraw_files',
  'control_conference',
  'draft_resolution'
] as const

export const CAPABILITY_LABELS: Record<Capability, string> = {
  view_conference: '查看会议状态',
  view_news: '查看全局新闻',
  view_situation: '查看全局局势',
  view_files: '查看文件',
  draft_news: '起草新闻草稿',
  review_news: '审核新闻',
  submit_directive: '提交指令',
  process_directive: '处理指令',
  send_files: '发送文件',
  publish_situation: '发布局势更新',
  withdraw_news: '撤回已发布新闻',
  withdraw_situation: '撤回已发布局势更新',
  withdraw_files: '撤回已发布文件',
  control_conference: '控制会议流程',
  draft_resolution: '起草决议'
}

export type CommitteeType = 'cabinet' | 'mpc' | 'ipc'
/** Backwards-compatible spelling used by the existing conference editor. */
export type SeatGroupType = CommitteeType
export type CabinetMode = 'standing' | 'crisis'

/** The Host-owned committee metadata needed for routing and labels. */
export interface CommitteeRecord {
  id: string
  conferenceId: string
  name: string
  type: CommitteeType
  mode?: CabinetMode
  defaultCapabilities?: Capability[]
  sortOrder?: number
}

/** A safe Seat projection. It never contains a User's real name. */
export interface SeatRecord {
  id: string
  committeeId: string
  name: string
  role?: string
  roleId?: string
  capabilityOverrides?: Partial<Record<Capability, boolean>>
  proceduralProfile?: ProceduralSeatProfile
}

/** Static procedure configuration available only in a Chair projection. */
export interface ProceduralSeatProfile {
  shortName?: string
  flagUrl?: string
  hasVotingRights: boolean
  sortOrder: number
}

export interface ChairAssignment {
  seatId: string
  committeeId: string
}

/** Identity returned to a normal UserClient after authentication. */
export interface UserClientIdentity {
  seatId: string
  seatName: string
  role?: string
  committeeId: string
  committeeName: string
  capabilities: Capability[]
}

// ---------------------------------------------------------------------------
// Shared content
// ---------------------------------------------------------------------------

export interface ContentOrigin {
  conferenceId: string
  sourceCommitteeId: string
  sourceSeatId: string
}

export interface ContentAuthorView {
  committeeName: string
  seatName: string
  role?: string
}

export interface ContentRecord extends ContentOrigin {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
  /** The safe display-only author projection, never a User record. */
  author?: ContentAuthorView
}

export type DirectiveStatus = 'submitted' | 'processing' | 'approved' | 'rejected' | 'cancelled'

/** The sole recipient of a Directive. Seat and free-form targets are invalid. */
export interface DirectiveTarget {
  committeeId: string
}

export interface Directive extends ContentRecord {
  targetCommitteeId: string
  status: DirectiveStatus
  claimedBySeatId?: string
  claimedAt?: number
  processingNote?: string
  rejectedAt?: number
  approvedAt?: number
  cancelledAt?: number
  cancellationReason?: string
  /** Durable key supplied by a client to make submission idempotent. */
  idempotencyKey?: string
}

export type NewsStatus = 'submitted' | 'published' | 'rejected' | 'retracted'

export interface News extends ContentRecord {
  /** News source label, e.g. a wire-service name. */
  source: string
  status: NewsStatus
  reviewedBySeatId?: string
  reviewedAt?: number
  reviewNote?: string
  publishedAt?: number
  retractedAt?: number
  retractionReason?: string
  /** Durable key supplied by a client to make submission idempotent. */
  idempotencyKey?: string
}

export type SituationStatus = 'published' | 'retracted'

export interface TimelineProjection {
  id: string
  name: string
  simulationTime: number
  status: string
}

export interface SituationUpdate extends ContentRecord {
  status: SituationStatus
  timelineId: string
  /** The IPC publish form receives this minimum projection only. */
  timeline?: TimelineProjection
  relatedBattleId?: string
  relatedLocation?: {
    lat: number
    lng: number
    label?: string
  }
  publishedAt?: number
  retractedAt?: number
  retractionReason?: string
  idempotencyKey?: string
}

/** Files are intentionally represented as a placeholder until that subsystem opens. */
export interface FileContent extends ContentRecord {
  status: 'published' | 'retracted'
  fileName: string
  mimeType?: string
  size?: number
  retractedAt?: number
  retractionReason?: string
}

export type SharedContent = Directive | News | SituationUpdate | FileContent

// ---------------------------------------------------------------------------
// Projections
// ---------------------------------------------------------------------------

export interface UserClientSessionProjection {
  conferenceId: string
  conferenceName: string
  identity: UserClientIdentity
  /** Authorized normal content only; workflow queues are separate. */
  directives: Directive[]
  news: News[]
  situations: SituationUpdate[]
  /** Routing labels only, never Committee membership or procedure state. */
  directiveTargets: Array<{ id: string; name: string }>
  /** Available only to a Seat that may publish situations. */
  timelines: TimelineProjection[]
  /** The user may see that files are not implemented, but receives no files. */
  filesAvailable: false
}

export interface WorkflowAudienceProjection {
  directives: Directive[]
  news: News[]
}

/** A Chair gets only its assigned Committee and static Seat information. */
export interface ChairCommitteeProjection {
  conferenceId: string
  conferenceName: string
  committee: CommitteeRecord
  seats: ChairSeatProjection[]
  chairAssignment: ChairAssignment
}

/**
 * Static seat data that a Chair needs to run its local procedure. Capability
 * configuration remains a Host Console concern and is not part of this view.
 */
export interface ChairSeatProjection {
  id: string
  name: string
  role?: string
  proceduralProfile?: ProceduralSeatProfile
  /** The only allowed cross-user identity disclosure. */
  assignedUserName?: string
}

export interface AuthenticatedSeatSession {
  sessionId: string
  conferenceId: string
  seatId: string
  identity: UserClientIdentity
  projection: UserClientSessionProjection
  chairProjection?: ChairCommitteeProjection
  connectedAt: number
}

export interface LocalDraft<T extends object = Record<string, unknown>> {
  id: string
  kind: 'directive' | 'news' | 'situation'
  hostId: string
  conferenceId: string
  seatId: string
  updatedAt: number
  payload: T
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type AuditActorKind = 'host_console' | 'user_client'

export interface AuditActor {
  kind: AuditActorKind
  sessionId?: string
  seatId?: string
}

export interface AuditLogEntry {
  id: string
  conferenceId?: string
  timestamp: number
  actor: AuditActor
  action: string
  entityType?:
    'conference' | 'committee' | 'seat' | 'directive' | 'news' | 'situation' | 'file' | 'session'
  entityId?: string
  reason?: string
  metadata?: Record<string, string | number | boolean | null>
}
