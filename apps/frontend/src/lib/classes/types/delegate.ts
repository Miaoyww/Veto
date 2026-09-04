// ============================================================
// types-delegate.ts — 代表端领域模型
// ============================================================
// SeatGroup、Seat、User、Directive、News、SituationUpdate 等
// 代表端核心类型定义。

// ---- 能力系统 -------------------------------------------------------------

/** Seat 可执行的操作能力 */
export type Capability =
  | 'view_conference'
  | 'view_situation'
  | 'view_news'
  | 'view_files'
  | 'draft_news'
  | 'review_news'
  | 'submit_directive'
  | 'process_directive'
  | 'send_files'
  | 'publish_situation'
  | 'control_conference'
  | 'draft_resolution'

/** 能力中文标签（与 CONTEXT.md 术语表一致，全库唯一真源，条目须覆盖全部 Capability） */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  view_conference: '查看会议状态',
  view_situation: '查看全局局势',
  view_news: '查看全局新闻',
  view_files: '查看文件',
  draft_news: '起草新闻草稿',
  review_news: '审核新闻',
  submit_directive: '提交指令',
  process_directive: '处理指令',
  send_files: '发送文件',
  publish_situation: '发布局势更新',
  control_conference: '控制会议流程',
  draft_resolution: '起草决议'
}

/** 能力选项（顺序即 UI 展示顺序），由 CAPABILITY_LABELS 派生，禁止另立清单 */
export const CAPABILITY_OPTIONS: Array<{ value: Capability; label: string }> = Object.entries(
  CAPABILITY_LABELS
).map(([value, label]) => ({ value: value as Capability, label }))

// ---- 席位组 ---------------------------------------------------------------

/** 席位组类型 */
export type SeatGroupType = 'cabinet' | 'mpc' | 'ipc'

/** 内阁/委员会运行模式 */
export type CabinetMode = 'standing' | 'crisis'

/** 席位组 */
export interface SeatGroup {
  id: string
  /** 显示名称，如 "美国内阁"、"MPC"、"学团 IPC" */
  name: string
  /** 席位组类型 */
  type: SeatGroupType
  /** 默认能力集（Seat 级别可覆盖） */
  defaultCapabilities: Capability[]
  /** 排序权重 */
  sortOrder: number
}

// ---- 席位 -----------------------------------------------------------------

export type Attendance = 'present' | 'absent'

/** 仅议事席位具有的程序状态 */
export interface SeatProcedure {
  shortName?: string
  flagUrl?: string
  attendance: Attendance
  hasVotingRights: boolean
  sortOrder: number
}

/** 席位 */
export interface Seat {
  id: string
  /** 显示名称，如 "海军部长"、"新华社记者"、"推演官 A" */
  name: string
  /** 所属 SeatGroup ID */
  seatGroupId: string
  /** 当前使用者；席位尚未被认领时为空 */
  userId?: string
  /** 能力覆盖（只存与 SeatGroup 默认值不同的项） */
  capabilityOverrides: Partial<Record<Capability, boolean>>
  /** 角色/职务描述，如 "外交部长" */
  role?: string
  /** 引用的大会级角色模板 */
  roleId?: string
  /** 点名、发言和投票状态；MPC/IPC 席位没有该字段 */
  procedure?: SeatProcedure
}

export type ParticipantSeat = Seat & { procedure: SeatProcedure }

export function isParticipantSeat(seat: Seat): seat is ParticipantSeat {
  return seat.procedure != null
}

/** 界面、投屏和网络同步使用的安全席位投影 */
export interface SeatView {
  id: string
  name: string
  role?: string
  procedure?: SeatProcedure
}

export function toSeatView(seat: Seat): SeatView {
  return {
    id: seat.id,
    name: seat.name,
    role: seat.role,
    procedure: seat.procedure ? { ...seat.procedure } : undefined
  }
}

// ---- 用户与访问 -----------------------------------------------------------

/** 大会内与一个席位一对一的本地用户 */
export interface User {
  id: string
  name: string
  passwordHash?: string
  passwordSalt?: string
}

/** 通过邀请码定位席位的访问入口 */
export interface SeatAccess {
  seatId: string
  inviteCode: string
}

export interface UserView {
  id: string
  name: string
  hasPassword: boolean
}

/** 代表端认证后使用的临时连接上下文，不持久化 */
export interface AuthenticatedSeatSession {
  conferenceId: string
  seat: SeatView
  seatGroupId: string
  capabilities: Capability[]
  user: UserView
}

// ---- 指令 -----------------------------------------------------------------

/** 保密等级 */
export type Classification = 'top_secret' | 'secret' | 'confidential' | 'public'

/** 指令状态 */
export type DirectiveStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

/** 指令 */
export interface Directive {
  id: string
  /** 标题 */
  title: string
  /** 发起人 Seat ID */
  initiatorId: string
  /** 发起人职务 */
  initiatorRole: string
  /** 接收方（Seat ID、SeatGroup ID 或 "ipc"） */
  target: string
  /** 保密等级 */
  classification: Classification
  /** 正文 */
  content: string
  /** 状态 */
  status: DirectiveStatus
  /** 所属内阁 SeatGroup ID */
  cabinetId: string
  /** 审核意见（驳回时填写） */
  reviewComment?: string
  /** 时间戳 */
  createdAt: number
  /** 更新时间戳 */
  updatedAt: number
}

// ---- 新闻 -----------------------------------------------------------------

/** 新闻状态 */
export type NewsStatus = 'draft' | 'submitted' | 'published' | 'rejected' | 'retracted'

/** 新闻 */
export interface News {
  id: string
  /** 标题 */
  title: string
  /** 正文（Markdown） */
  content: string
  /** 来源通讯社名称，如 "新华社"、"路透社" */
  source: string
  /** 起草人 Seat ID */
  authorId: string
  /** 所属 SeatGroup ID（MPC） */
  seatGroupId: string
  /** 状态 */
  status: NewsStatus
  /** 审核意见（驳回时填写） */
  reviewComment?: string
  /** 审核人 Seat ID */
  reviewerId?: string
  /** 时间戳 */
  createdAt: number
  /** 发布时间戳 */
  publishedAt?: number
  /** 撤回时间戳 */
  retractedAt?: number
}

// ---- 局势更新 -------------------------------------------------------------

/** 局势更新 */
export interface SituationUpdate {
  id: string
  /** 标题 */
  title: string
  /** 正文（Markdown） */
  content: string
  /** 发布方 SeatGroup ID（学团 IPC） */
  publisherId: string
  /** 发布人 Seat ID */
  authorId: string
  /** 关联的 Timeline ID */
  timelineId: string
  /** 预留：关联的 Battle ID */
  relatedBattleId?: string
  /** 预留：关联的地图位置 */
  relatedLocation?: {
    lat: number
    lng: number
    label?: string
  }
  /** 时间戳 */
  createdAt: number
}
