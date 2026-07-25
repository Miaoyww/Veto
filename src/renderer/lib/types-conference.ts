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

export interface Delegation {
  id: string
  /** 国家/组织全名，如 "中华人民共和国" */
  name: string
  /** 简称，如 "中国"。用于 UI badge 和模糊搜索匹配 */
  shortName?: string
  /** 国旗 emoji 或图片 URL（可选） */
  flagUrl?: string
  /** 点名出勤状态 */
  attendance: 'present' | 'absent'
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
  originalDelegationName: string
  yieldType: 'delegate' | 'question' | 'comment'
  /** 让渡时的剩余秒数 */
  remainingSec: number
  /** 原发言人分配的总时长 */
  allocatedSec: number
  /** 提问方代表团 ID（question 类型专用） */
  questionerDelegationId?: string
  /** 提问方代表团名称（question 类型专用） */
  questionerDelegationName?: string
}

export interface SpeakerEntry {
  id: string
  delegationId: string
  addedAt: number
  /** 分配的发言时间（秒），默认 120 */
  allocatedTimeSec: number
  /** 暂停/中断时剩余时间 */
  remainingTimeSec?: number
  status: 'waiting' | 'ready' | 'speaking' | 'finished' | 'interrupted'
  /** 发言人做出的让渡选择 */
  yield?: YieldChoice
  /** 是否允许让渡（通过让渡获得时间的发言人不可再次让渡），默认 true */
  canYield?: boolean
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

export type MotionType =
  | 'open_speakers_list' // 开启主发言名单
  | 'moderated_caucus' // 有主持核心磋商
  | 'unmoderated_caucus' // 自由磋商
  | 'modify_speaking_time' // 修改发言时间
  | 'postpone_resolution' // 延置决议草案
  | 'resume_resolution' // 恢复决议草案
  | 'closure_debate' // 结束辩论
  | 'suspend_meeting' // 暂时休会
  | 'close_meeting' // 闭幕
  | 'reorder_resolution' // 调整投票顺序
  | 'substantive_vote' // 实质性投票

export interface AbstractMotion {
  id: string
  type: MotionType
  /** 动议提出代表团 ID */
  proposedByDelegationId: string
  proposedAt: number
  status: 'pending' | 'approved' | 'rejected' | 'expired'
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
  substantive_vote: '实质性投票'
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

export interface VoteBallot {
  delegationId: string
  vote: 'yes' | 'no' | 'abstain'
}

export interface VotingSession {
  id: string
  /** 表决对象类型 */
  targetType: 'motion' | 'resolution'
  /** 表决对象 ID */
  targetId: string
  /** 多数规则 */
  majorityRule: 'simple_majority' | 'two_thirds'
  ballots: VoteBallot[]
  startedAt: number
  endedAt?: number
  result?: 'passed' | 'failed'
}

// ---- 会议记录 ------------------------------------------------------------

export type MinutesEventType =
  | 'roll_call_completed'
  | 'roll_call_reset'
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
  speakersList: SpeakerEntry[]
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
    proposerPosition: 'first' | 'last'
    /** 已加入的代表团 ID 列表（有序） */
    speakerDelegationIds: string[]
    /** 名单耗尽后重回 setup 时的剩余秒数 */
    remainingSec?: number
  } | null

  /** 当前磋商计时器状态 */
  activeCaucus?: {
    motionId: string
    type: 'moderated' | 'unmoderated'
    /** 真实世界开始时间戳（总计时） */
    startedAt: number
    /** 真实世界结束时间戳（总计时） */
    endAt: number
    /** 已过总秒数 */
    elapsedSec: number
    /** 暂停时间戳（非空 = 已暂停，用于自由磋商暂停） */
    pausedAt?: number
    /** 有主持磋商发言顺序（按发言列表顺序） */
    caucusSpeakers?: Array<{
      delegationId: string
      delegationName: string
      status: 'waiting' | 'ready' | 'speaking'
      allocatedTimeSec: number
    }>
    /** 当前发言人在 caucusSpeakers 中的索引 */
    currentSpeakerIndex?: number
  } | null

  /** 当前发言计时器状态 */
  activeSpeaker?: {
    entryId: string
    /** 真实世界开始时间戳 */
    startedAt: number
    /** 真实世界结束时间戳 */
    endAt: number
    /** 暂停时间戳（非空 = 已暂停） */
    pausedAt?: number
  } | null

  /** 让渡处理中的中间状态（控制端用来逐步解析让渡） */
  yieldPending?: YieldPendingState | null
}

// ---- 显示窗口同步数据 -----------------------------------------------------

/** 动议编辑草稿 —— 实时同步到 Display 窗口 */
export interface MotionDraft {
  /** 动议提出方代表团名称 */
  proposedByName?: string
  /** 动议类型 */
  type?: MotionType
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
  /** 问题提出方代表团名称 */
  proposedByName?: string
  /** 问题类型 */
  type?: PointType
}

export interface ConferenceDisplayData {
  conferenceId: string
  phase: ConferencePhase
  venue: string
  name: string
  /** 动议编辑草稿（编辑中实时同步） */
  motionDraft?: MotionDraft
  /** 问题编辑草稿（编辑中实时同步） */
  pointDraft?: PointDraft
  currentSpeaker?: {
    delegationName: string
    shortName?: string
    remainingSec: number
    allocatedSec: number
    /** 计时状态 */
    status: 'playing' | 'paused'
  }
  /** 预发言状态（ready 阶段，即将发言的代表团） */
  readySpeaker?: {
    delegationName: string
    shortName?: string
  }
  speakersList: Array<{
    delegationName: string
    shortName?: string
    status: string
  }>
  votingSession?: {
    targetDescription: string
    majorityRule: string
    tally: { yes: number; no: number; abstain: number; present: number }
    result?: string
  }
  activeMotion?: {
    type: MotionType
    topic?: string
    status: string
    proposedByName: string
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
    proposedByName: string
    pointId: string
  }
  caucusSetup?: {
    topic?: string
    proposerName?: string
    proposerPosition: 'first' | 'last'
    speakerDelegationIds: string[]
    speakerNames: string[]
  }
  caucusTimer?: {
    remainingSec: number
    totalSec: number
    type: 'moderated' | 'unmoderated'
    /** 计时状态 */
    status: 'running' | 'paused'
    topic?: string
    /** 有主持磋商发言顺序 */
    caucusSpeakers?: Array<{
      delegationName: string
      status: 'waiting' | 'ready' | 'speaking'
      allocatedTimeSec: number
    }>
    currentSpeakerIndex?: number
    /** 发言人切换原因：timeout=计时器自然到期，ended=主席手动结束 */
    speakerTransition?: 'timeout' | 'ended'
  }
  recentMinutes: Array<{
    timestamp: number
    eventType: MinutesEventType
    description: string
  }>
  /** 让渡处理中状态（Display 端展示让渡流程） */
  yieldPending?: {
    yieldType: 'delegate' | 'question' | 'comment'
    originalDelegationName: string
    remainingSec: number
    questionerDelegationName?: string
  }
  /** 点名进度（roll_call 阶段使用） */
  rollCall?: {
    currentIndex: number
    totalCount: number
    currentDelegationName?: string
    currentDelegationShortName?: string
    presentCount: number
    simpleMajorityThreshold: number
    twoThirdsThreshold: number
    /** 刚刚标记的代表团结果（供 Display 端展示确认动画） */
    lastMarked?: {
      delegationName: string
      shortName?: string
      status: 'present' | 'absent'
      index: number
    }
  }
}
