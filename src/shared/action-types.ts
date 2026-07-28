/**
 * action-types.ts — 统一操作类型体系（main + renderer 进程共用）
 *
 * ConferenceActionType 是会议操作的权威定义，Service 插件事件类型由此派生。
 * TimelineActionType 是时间线操作的权威定义。
 * ActionType 统合两者，供插件事件系统等泛化场景使用。
 * 新增操作只需在此处添加，对应 EventType 会自动包含。
 */

// ── 会议操作类型 ──────────────────────────────────────────────────────────

/** 会议操作类型（权威定义，共 25 种） */
export type ConferenceActionType =
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
  | 'attendance_changed'
  | 'point_proposed'
  | 'conference_created'

// ── 时间线操作类型 ────────────────────────────────────────────────────────

/** 时间线操作类型（共 6 种） */
export type TimelineActionType =
  | 'paused'
  | 'resumed'
  | 'ratio_changed'
  | 'time_milestone'
  | 'created'
  | 'deleted'

// ── 统一操作类型 ──────────────────────────────────────────────────────────

/** 所有操作类型的联合（用于插件事件系统等泛化场景） */
export type ActionType = ConferenceActionType | TimelineActionType

// ── 操作类型标签 ──────────────────────────────────────────────────────────

/** 操作类型中文标签（涵盖会议 + 时间线全部 30 种操作） */
export const ACTION_LABELS: Record<ActionType, string> = {
  // 会议操作
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
  attendance_changed: '出席变更',
  point_proposed: '问题提出',
  conference_created: '大会创建',
  // 时间线操作
  paused: '暂停',
  resumed: '恢复',
  ratio_changed: '倍率变更',
  time_milestone: '时间节点',
  created: '创建',
  deleted: '删除'
}

// ── 操作日志条目 ──────────────────────────────────────────────────────────

/** 操作日志条目基类（泛化：不限定具体的 actionType 子类型） */
export interface Entry {
  /** 唯一标识 */
  id: string
  /** 现实时间戳（毫秒） */
  timestamp: number
  /** 操作类型 */
  actionType: ActionType
  /** 操作描述文本 */
  description: string
}

/** 会议操作条目（actionType 收窄为会议操作，增加关联字段） */
export interface ConferenceEntry extends Entry {
  actionType: ConferenceActionType
  /** 关联代表团 ID（可选） */
  relatedDelegationId?: string
  /** 关联动议 ID（可选） */
  relatedMotionId?: string
  /** 关联决议 ID（可选） */
  relatedResolutionId?: string
}
