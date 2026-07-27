/**
 * @veto/sdk — 类型定义
 *
 * Service 插件与 Veto Core 之间的公共类型契约。
 */

/** 会议相关事件 */
export type ConferenceEventType =
  | 'conference:phase_changed'
  | 'conference:speaker_started'
  | 'conference:speaker_finished'
  | 'conference:motion_proposed'
  | 'conference:motion_approved'
  | 'conference:voting_started'
  | 'conference:voting_ended'
  | 'conference:caucus_started'
  | 'conference:caucus_ended'
  | 'conference:meeting_suspended'
  | 'conference:meeting_resumed'
  | 'conference:meeting_closed'
  | 'conference:roll_call_completed'

/** 时间线相关事件 */
export type TimelineEventType =
  | 'timeline:paused'
  | 'timeline:resumed'
  | 'timeline:ratio_changed'
  | 'timeline:created'
  | 'timeline:deleted'

/** 所有 Service 事件类型 */
export type ServiceEventType = ConferenceEventType | TimelineEventType

/** 事件负载 */
export interface ServiceEventPayload {
  type: ServiceEventType
  timestamp: number
  data: Record<string, unknown>
}

/** 时间线摘要 */
export interface TimelineSummary {
  id: string
  name: string
  createdAt: number
  paused: boolean
  ratio: number
  simTime: number
  realAnchor: number
}

/** 会议日志条目 */
export interface MinutesEntry {
  id: string
  timestamp: number
  type: string
  title: string
  detail?: string
}

/** 会议摘要 */
export interface ConferenceSummary {
  id: string
  name: string
  venue?: string
  phase: string
  presentCount: number
  votingCount: number
  currentSpeaker?: { delegation: string; remaining: number }
  timelineId?: string | null
}

/** VetoClient 配置选项 */
export interface VetoClientOptions {
  /** PluginServer 端口，默认从 VETO_WS_PORT 环境变量读取 */
  port?: number
  /** PluginServer 主机，默认 127.0.0.1 */
  host?: string
  /** 是否自动连接，默认 true */
  autoConnect?: boolean
  /** 是否自动重连，默认 true */
  reconnect?: boolean
  /** 重连间隔 ms，默认 3000 */
  reconnectInterval?: number
  /** 插件 ID */
  pluginId?: string
  /** 插件目录 */
  pluginDir?: string
}

/** VetoClient 运行状态 */
export interface VetoClientStatus {
  connected: boolean
  subscribedEvents: string[]
}

/** 事件处理函数 */
export type EventHandler = (payload: ServiceEventPayload) => void | Promise<void>
