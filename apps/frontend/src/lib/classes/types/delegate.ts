// ============================================================
// types-delegate.ts — 代表端领域模型
// ============================================================
// SeatGroup、Seat、Account、Directive、News、SituationUpdate 等
// 代表端核心类型定义。

import type { Delegation } from './conference'

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
export type SeatGroupType = 'cabinet' | 'mpc'

/** 内阁/委员会运行模式 */
export type CabinetMode = 'standing' | 'crisis'

/** 席位组 */
export interface SeatGroup {
  id: string
  /** 显示名称，如 "美国内阁"、"MPC"、"学团 IPC" */
  name: string
  /** 席位组类型 */
  type: SeatGroupType
  /** 绑定的 Delegation ID（可选；MPC 不绑定，IPC 可临时绑定） */
  delegationId?: string
  /** 默认能力集（Seat 级别可覆盖） */
  defaultCapabilities: Capability[]
  /** 内阁/委员会类型时有效 */
  mode?: CabinetMode
  /** 排序权重 */
  sortOrder: number
}

// ---- 席位 -----------------------------------------------------------------

/** 席位 */
export interface Seat {
  id: string
  /** 显示名称，如 "海军部长"、"新华社记者"、"推演官 A" */
  name: string
  /** 所属 SeatGroup ID */
  seatGroupId: string
  /** 绑定的 Delegation ID（可选，用于覆盖 SeatGroup 级别绑定） */
  delegationId?: string
  /** 能力覆盖（只存与 SeatGroup 默认值不同的项） */
  capabilityOverrides: Partial<Record<Capability, boolean>>
  /** 邀请码（一人一码） */
  inviteCode: string
  /** 密码哈希（本地 Chair 端管理） */
  passwordHash: string
  /** 密码盐值 */
  passwordSalt?: string
  /** 角色/职务描述，如 "外交部长" */
  role?: string
  /** 引用的大会级角色模板 */
  roleId?: string
}

// ---- 账号 -----------------------------------------------------------------

/** 本地账号 */
export interface Account {
  id: string
  /** 账号名 */
  username: string
  /** 当前绑定的 Seat ID */
  seatId?: string
  /** 当前连接的 Conference ID */
  conferenceId?: string
  /** 预留：未来迁移云服务的用户标识 */
  cloudUserId?: string
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
  /** 接收方（Delegation ID、SeatGroup ID 或 "ipc"） */
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
