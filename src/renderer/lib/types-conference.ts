// ============================================================
// types-conference.ts — 模拟大会（Model UN Conference）领域模型
// ============================================================

// ---- 会议阶段 -----------------------------------------------------------

export type ConferencePhase =
  | 'preamble' // 刚创建，尚未开始点名
  | 'roll_call' // 点名
  | 'pending_speakers_list' // 等待开启主发言名单（点名结束 / 休会恢复后）
  | 'general_debate' // 一般性辩论（主发言名单阶段）
  | 'caucus' // 磋商中（有主持或自由磋商）
  | 'voting' // 投票表决中
  | 'motion' // 动议（Display 专用：编辑/表决/结果）
  | 'caucus_setup' // 磋商发言名单设置
  | 'suspended' // 暂时休会
  | 'closed' // 闭幕

// ---- 代表团（替代 Faction）-----------------------------------------------

export type Attendance = 'present' | 'absent'

export interface Delegation {
  id: string
  /** 国家/组织全名，如 "中华人民共和国" */
  name: string
  /** 简称，如 "中国"。用于 UI badge 和模糊搜索匹配 */
  shortName?: string
  /** 国旗 emoji 或图片 URL（可选） */
  flagUrl?: string
  /** 点名出勤状态 */
  attendance: Attendance
  /** 是否拥有投票权（默认 true，false 即为观察员） */
  vetoPower: boolean
  /** 排序权重（越小越靠前） */
  sortOrder: number
}

// ---- 议题 ---------------------------------------------------------------

export interface AgendaItem {
  id: string
  title: string
  description?: string
  sortOrder: number
}

// ---- 主发言名单 ----------------------------------------------------------

export type YieldType = 'chair' | 'delegate' | 'question' | 'comment'

export type SpeakerEntryStatus =
  | 'waiting'
  | 'ready'
  | 'speaking'
  | 'finished'
  | 'interrupted'

/** 磋商发言人的活跃状态（不包括 finished/interrupted） */
export type CaucusSpeakerStatus = 'waiting' | 'ready' | 'speaking'

export interface YieldChoice {
  type: YieldType
  /** 当 type='delegate' 时，让渡给的代表团 ID */
  delegationId?: string
  /** 当 type='question'/'comment' 时，提问/评论方的代表团 ID */
  fromDelegationId?: string
}

/** 让渡处理中的中间状态（控制端用来逐步解析让渡） */
export interface YieldPendingState {
  originalEntryId: string
  originalDelegationId: string
  originalDelegation: Delegation
  yieldType: YieldType
  /** 让渡时的剩余秒数 */
  remainingSec: number
  /** 原发言人分配的总时长 */
  allocatedSec: number
  /** 提问方代表团 ID（question 类型专用） */
  questionerDelegationId?: string
  /** 提问方代表团（question 类型专用） */
  questionerDelegation?: Delegation
}

export interface SpeakerEntry {
  id: string
  delegationId: string
  /** 分配的发言时间（秒），默认 120 */
  allocatedTimeSec: number
  /** 暂停/中断时剩余时间 */
  remainingTimeSec?: number
  status: SpeakerEntryStatus
  /** 发言人做出的让渡选择 */
  yield?: YieldChoice
  /** 是否允许让渡（通过让渡获得时间的发言人不可再次让渡），默认 true */
  canYield?: boolean
}

/** 发言名单的 JSON 序列化格式 */
export interface SpeakerListData {
  id: string
  name: string
  entries: SpeakerEntry[]
}

// ---- 问题系统 ------------------------------------------------------------

export type PointType =
  | 'point_of_order' // 程序性问题
  | 'point_of_inquiry' // 咨询性问题
  | 'point_of_personal_privilege' // 个人特权问题

export const POINT_LABELS: Record<PointType, string> = {
  point_of_order: '程序性问题',
  point_of_inquiry: '咨询性问题',
  point_of_personal_privilege: '个人特权问题'
}

// ---- 动议系统 ------------------------------------------------------------

/** 动议类型，对应模拟联合国会议中的各类动议 */
export type MotionType =
  /** 开启主发言名单 */
  | 'open_speakers_list'
  /** 有主持核心磋商 */
  | 'moderated_caucus'
  /** 自由磋商 */
  | 'unmoderated_caucus'
  /** 修改发言时间 */
  | 'modify_speaking_time'
  /** 延置决议草案 */
  | 'postpone_resolution'
  /** 恢复决议草案 */
  | 'resume_resolution'
  /** 结束辩论 */
  | 'closure_debate'
  /** 暂时休会 */
  | 'suspend_meeting'
  /** 闭幕 */
  | 'close_meeting'
  /** 调整投票顺序 */
  | 'reorder_resolution'
  /** 实质性投票 */
  | 'substantive_vote'
  /** 更改出席状态 */
  | 'change_attendance'

export type MotionStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface AbstractMotion {
  id: string
  type: MotionType
  /** 动议提出代表团 */
  proposedBy: Delegation
  proposedAt: number
  status: MotionStatus
}

/** 有主持核心磋商 */
export interface ModeratedCaucusMotion extends AbstractMotion {
  type: 'moderated_caucus'
  topic: string
  /** 总时长（秒） */
  totalTimeSec: number
  /** 每人发言时间（秒） */
  speakingTimePerPersonSec: number
  /** 最大发言人数 = floor(totalTimeSec / speakingTimePerPersonSec) */
  maxSpeakers: number
}

/** 自由磋商 */
export interface UnmoderatedCaucusMotion extends AbstractMotion {
  type: 'unmoderated_caucus'
  /** 总倒计时（秒） */
  durationSec: number
}

/** 修改发言时间 */
export interface ModifySpeakingTimeMotion extends AbstractMotion {
  type: 'modify_speaking_time'
  newTimeSec: number
}

/** 延置决议草案 */
export interface PostponeResolutionMotion extends AbstractMotion {
  type: 'postpone_resolution'
  agendaItemId: string
}

/** 恢复决议草案 */
export interface ResumeResolutionMotion extends AbstractMotion {
  type: 'resume_resolution'
  agendaItemId: string
}

/** 结束辩论 */
export interface ClosureDebateMotion extends AbstractMotion {
  type: 'closure_debate'
}

/** 暂时休会 */
export interface SuspendMeetingMotion extends AbstractMotion {
  type: 'suspend_meeting'
}

/** 闭幕 */
export interface CloseMeetingMotion extends AbstractMotion {
  type: 'close_meeting'
}

/** 调整投票顺序 */
export interface ReorderResolutionMotion extends AbstractMotion {
  type: 'reorder_resolution'
  /** 排序后的议程项 ID 列表 */
  newOrder: string[]
}

/** 实质性投票（对决议草案、修正案等文件的唱名表决） */
export interface SubstantiveVoteMotion extends AbstractMotion {
  type: 'substantive_vote'
  /** 被表决的文件名称 */
  documentName: string
}

/** 更改出席状态 */
export interface ChangeAttendanceMotion extends AbstractMotion {
  type: 'change_attendance'
  /** 新的出席状态 */
  newAttendance: Attendance
}

export type Motion =
  | ModeratedCaucusMotion
  | UnmoderatedCaucusMotion
  | ModifySpeakingTimeMotion
  | PostponeResolutionMotion
  | ResumeResolutionMotion
  | ClosureDebateMotion
  | SuspendMeetingMotion
  | CloseMeetingMotion
  | ReorderResolutionMotion
  | SubstantiveVoteMotion
  | ChangeAttendanceMotion

/** 动议类型的中文标签 */
export const MOTION_LABELS: Record<MotionType, string> = {
  open_speakers_list: '开启主发言名单',
  moderated_caucus: '有主持核心磋商',
  unmoderated_caucus: '自由磋商',
  modify_speaking_time: '修改发言时间',
  postpone_resolution: '延置决议草案',
  resume_resolution: '恢复决议草案',
  closure_debate: '结束辩论',
  suspend_meeting: '暂时休会',
  close_meeting: '闭幕',
  reorder_resolution: '调整投票顺序',
  substantive_vote: '实质性投票',
  change_attendance: '更改出席状态'
}

export interface Point {
  id: string
  type: PointType
  /** 问题提出代表团 ID */
  proposedByDelegationId: string
  proposedAt: number
}

// ---- 决议草案 ------------------------------------------------------------

export interface DraftResolution {
  id: string
  title: string
  /** 起草国代表团 ID 列表 */
  sponsors: string[]
  /** 附议国代表团 ID 列表 */
  signatories: string[]
  /** 决议正文（自由文本，后续可改为结构化段落） */
  content: string
  /** 关联的议程项 ID */
  agendaItemId?: string
  createdAt: number
}

// ---- 投票系统 ------------------------------------------------------------

export type VoteValue = 'yes' | 'no' | 'abstain' | 'skip'

export type MajorityRule = 'simple_majority' | 'two_thirds'

export type VoteTargetType = 'motion' | 'resolution'

export interface VoteBallot {
  delegationId: string
  vote: VoteValue
}

export interface VotingSession {
  id: string
  /** 表决对象类型 */
  targetType: VoteTargetType
  /** 表决对象 ID */
  targetId: string
  /** 多数规则 */
  majorityRule: MajorityRule
  ballots: VoteBallot[]
  startedAt: number
  endedAt?: number
  result?: 'passed' | 'failed'
  /** 当前正在投票的代表团 ID（唱名表决顺序控制）；null 表示全部投完 */
  currentDelegationId: string | null
  /** 当前轮次：1 = 第一轮，2 = 第二轮（跳过代表团补投） */
  round: number
}

// ---- 会议记录 ------------------------------------------------------------

export type MinutesEventType =
  | 'roll_call_completed'
  | 'roll_call_reset'
  | 'speaker_ready'
  | 'speaker_started'
  | 'speaker_finished'
  | 'yield'
  | 'motion_proposed'
  | 'motion_voted'
  | 'motion_approved'
  | 'motion_rejected'
  | 'voting_started'
  | 'voting_ended'
  | 'caucus_started'
  | 'caucus_paused'
  | 'caucus_ended'
  | 'meeting_suspended'
  | 'meeting_resumed'
  | 'meeting_closed'
  | 'resolution_introduced'
  | 'resolution_passed'
  | 'resolution_failed'
  | 'phase_changed'
  | 'point_proposed'
  | 'conference_created'

export const MINUTES_EVENT_LABELS: Record<MinutesEventType, string> = {
  roll_call_completed: '点名完成',
  roll_call_reset: '重新点名',
  speaker_ready: '准备发言',
  speaker_started: '开始发言',
  speaker_finished: '发言结束',
  yield: '让渡时间',
  motion_proposed: '动议提出',
  motion_voted: '动议表决',
  motion_approved: '动议通过',
  motion_rejected: '动议未通过',
  voting_started: '开始投票',
  voting_ended: '投票结束',
  caucus_started: '磋商开始',
  caucus_paused: '磋商暂停',
  caucus_ended: '磋商结束',
  meeting_suspended: '暂时休会',
  meeting_resumed: '会议恢复',
  meeting_closed: '会议闭幕',
  resolution_introduced: '决议草案提交',
  resolution_passed: '决议通过',
  resolution_failed: '决议未通过',
  phase_changed: '阶段变更',
  point_proposed: '问题提出',
  conference_created: '大会创建'
}

export interface MinutesEntry {
  id: string
  /** 现实时间戳 */
  timestamp: number
  /** 事件类型 */
  eventType: MinutesEventType
  /** 事件描述文本 */
  description: string
  /** 关联代表团、动议、决议（可选） */
  relatedDelegationId?: string
  relatedMotionId?: string
  relatedResolutionId?: string
}

// ---- Conference（根实体）--------------------------------------------------

export type ProposerPosition = 'first' | 'last'

export type CaucusType = 'moderated' | 'unmoderated'

export interface Conference {
  id: string
  /** 大会名称，如 "安理会2026年第3次紧急会议" */
  name: string
  /** 会场/委员会，如 "联合国安全理事会" */
  venue: string
  createdAt: number
  updatedAt: number
  /** 当前阶段 */
  phase: ConferencePhase
  /** 代表团列表 */
  delegations: Delegation[]
  /** 议题列表 */
  agenda: AgendaItem[]
  /** 主发言名单 */
  speakerLists?: SpeakerListData
  /** 所有动议 */
  motions: Motion[]
  /** 已被主席忽略的已决动议 ID（取消对话框后不再展示其结果） */
  dismissedResolvedMotionIds: string[]
  /** 所有问题（Point） */
  points: Point[]
  /** 已被主席结束的问题 ID（结束后不再在 Display 展示） */
  dismissedPointIds: string[]
  /** 决议草案 */
  draftResolutions: DraftResolution[]
  /** 已记录的文件名称（用于实质性投票时的输入提示） */
  documentNames: string[]
  /** 投票记录 */
  votingSessions: VotingSession[]
  /** 会议记录 */
  minutes: MinutesEntry[]
  /** 默认发言时间（秒），默认 120 */
  defaultSpeakingTimeSec: number

  // ---- 运行时状态（不持久化到单独的 store，直接内嵌）----

  /** 磋商发言名单设置（caucus_setup 阶段使用） */
  caucusSetup?: {
    motionId: string
    /** 动议国发言位置：标首（第一个）还是标尾（最后一个） */
    proposerPosition: ProposerPosition
    /** 已加入的代表团 ID 列表（有序） */
    speakerDelegationIds: string[]
    /** 名单耗尽后重回 setup 时的剩余秒数 */
    remainingSec?: number
  } | null

  /** 当前磋商计时器状态（累计时间模型） */
  activeCaucus?: {
    motionId: string
    type: CaucusType

    /** 总分配时间（秒） */
    totalSec: number

    /** 已消耗时间（秒） */
    elapsedSec: number

    /** 是否暂停 */
    paused: boolean

    /** 用于同步和恢复 */
    updatedAt?: number

    /** 有主持磋商发言顺序（复用 SpeakerEntry，运行时 delegation 引用由引擎还原） */
    caucusSpeakers?: SpeakerEntry[]
    /** 当前发言人在 caucusSpeakers 中的索引 */
    currentSpeakerIndex?: number
  } | null

  /** 当前发言计时器状态（累计时间模型） */
  activeSpeaker?: {
    entryId: string
    /** 总分配时间（秒） */
    totalSec: number
    /** 已消耗时间（秒） */
    elapsedSec: number
    /** 是否暂停 */
    paused: boolean
  } | null

  /** 让渡处理中的中间状态（控制端用来逐步解析让渡） */
  yieldPending?: YieldPendingState | null

  /** 绑定的时间线 ID */
  timelineId?: string | null
}

// ---- 显示窗口同步数据 -----------------------------------------------------

/** 动议编辑草稿 —— 实时同步到 Display 窗口 */
export interface MotionDraft {
  /** 动议提出方代表团 */
  proposedBy?: Delegation
  /** 动议类型 */
  type?: MotionType
  /** 是否需要表决（false = 特殊动议，直接生效，不展示表决 UI） */
  isRequestingVote?: boolean
  /** 主题（moderated_caucus） */
  topic?: string
  /** 总时长秒数 */
  totalTimeSec?: number
  /** 每人发言秒数 */
  speakingTimePerPersonSec?: number
  /** 新的发言时间秒数（modify_speaking_time） */
  newTimeSec?: number
  /** 文件名称（substantive_vote） */
  documentName?: string
}

/** 问题编辑草稿 —— 实时同步到 Display 窗口 */
export interface PointDraft {
  /** 问题提出方代表团 */
  proposedBy?: Delegation
  /** 问题类型 */
  type?: PointType
}

// ---- Display 窗口用的命名类型（避免内联类型导致 Svelte 模板推断为 any）----

export type TimerStatus = 'running' | 'paused'

/** 发言人切换原因：timeout=计时器自然到期，ended=主席手动结束 */
export type SpeakerTransitionReason = 'timeout' | 'ended'

export interface ConferenceDisplaySpeaker {
  delegation: Delegation
  remainingSec: number
  allocatedSec: number
  /** 计时状态 */
  status: 'playing' | 'paused'
}

export interface ConferenceDisplayData {
  conferenceId: string
  phase: ConferencePhase
  venue: string
  name: string
  /** 当前出席的代表团数量（点名结束后持久可用） */
  presentCount: number
  /** 拥有投票权的出席代表人数（排除观察员，即 vetoPower === false） */
  votingCount: number
  /** 动议编辑草稿（编辑中实时同步） */
  motionDraft?: MotionDraft
  /** 问题编辑草稿（编辑中实时同步） */
  pointDraft?: PointDraft
  currentSpeaker?: ConferenceDisplaySpeaker
  /** 预发言状态（ready 阶段，即将发言的代表团） */
  readySpeaker?: {
    delegation: Delegation
  }
  speakersList: Array<{
    delegation: Delegation
    status: string
  }>
  votingSession?: {
    targetDescription: string
    majorityRule: string
    tally: { yes: number; no: number; abstain: number; present: number }
    result?: string
    /** 当前轮次 */
    round: number
    /** 当前正在投票的代表团 ID */
    currentDelegationId: string | null
    /** 每个出席代表团的投票状态，按投票顺序排列 */
    ballots: Array<{
      delegationId: string
      delegationName: string
      shortName?: string
      vote: string | null
    }>
  }
  activeMotion?: {
    type: MotionType
    topic?: string
    status: string
    proposedBy: Delegation
    motionId: string
    /** 总时长（秒），moderated_caucus / unmoderated_caucus */
    totalTimeSec?: number
    /** 每人发言时间（秒），moderated_caucus */
    speakingTimePerPersonSec?: number
    /** 新的发言时间（秒），modify_speaking_time */
    newTimeSec?: number
    /** 文件名称（substantive_vote） */
    documentName?: string
  }
  activePoint?: {
    type: PointType
    proposedBy: Delegation
    pointId: string
  }
  caucusSetup?: {
    topic?: string
    proposerName?: string
    proposerPosition: ProposerPosition
    speakerDelegationIds: string[]
    speakerNames: Delegation[]
  }
  caucusTimer?: {
    remainingSec: number
    totalSec: number
    type: CaucusType
    /** 计时状态 */
    status: TimerStatus
    topic?: string
    /** 有主持磋商发言顺序 */
    caucusSpeakers?: Array<{
      delegationName: string
      /** Display 组件用的 delegation 快照 */
      delegation: Delegation
      status: CaucusSpeakerStatus
      allocatedTimeSec: number
    }>
    currentSpeakerIndex?: number
    /** 发言人切换原因：timeout=计时器自然到期，ended=主席手动结束 */
    speakerTransition?: SpeakerTransitionReason
  }
  recentMinutes: Array<{
    timestamp: number
    eventType: MinutesEventType
    description: string
  }>
  /** 让渡处理中状态（Display 端展示让渡流程） */
  yieldPending?: {
    yieldType: YieldType
    originalDelegation: Delegation
    questionerDelegation?: Delegation
    remainingSec: number
  }
  /** 出席状态变更通知（独立于 rollCall，由 changeDelegationAttendance 统一触发） */
  attendanceChange?: Delegation
  /** 点名进度（roll_call 阶段使用） */
  rollCall?: {
    currentIndex: number
    totalCount: number
    currentDelegation?: Delegation
    presentCount: number
    simpleMajorityThreshold: number
    twoThirdsThreshold: number
    /** 刚刚标记的代表团结果（供 Display 端展示确认动画） */
    lastMarked?: {
      delegation: Delegation
      status: Attendance
      index: number
    }
  }
}
