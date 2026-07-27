/**
 * service-plugin.ts — Service 插件类型定义
 *
 * 定义 Service 插件的核心类型契约。这些类型是主进程（ServiceManager、
 * EventBus、DataQueryAPI）和 service 插件（.mjs）之间的公共接口。
 */

// ── 事件类型 ──────────────────────────────────────────────────────────────

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

// ── 数据传输类型（轻量，避免引入 Svelte 响应式类型到主进程）──────────────

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

// ── DataQueryAPI ──────────────────────────────────────────────────────────

/** Service 插件的数据查询接口 */
export interface DataQueryAPI {
  /** 查询所有时间线 */
  queryTimelines(): TimelineSummary[]
  /** 查询所有会议 */
  queryConferences(): ConferenceSummary[]
  /** 查询指定会议的日志 */
  getConferenceMinutes(conferenceId: string, limit?: number): MinutesEntry[]
}

// ── ServiceContext ────────────────────────────────────────────────────────

/** 注入到 service 插件的完整运行时上下文 */
export interface ServiceContext {
  /** 插件元数据 */
  meta: {
    id: string
    name: string
    version: string
    pluginDir: string
  }

  /** 数据查询 API */
  data: DataQueryAPI

  /** 插件配置读写 */
  config: {
    get(): Record<string, unknown>
    save(data: Record<string, unknown>): void
  }

  /** 订阅 Veto 事件（从 Renderer 发出的状态变更） */
  onEvent(handler: (payload: ServiceEventPayload) => void): () => void

  /** 日志输出 */
  log: {
    info(msg: string): void
    warn(msg: string): void
    error(msg: string): void
  }
}

// ── ServicePlugin ─────────────────────────────────────────────────────────

/** Service 插件必须导出的接口 */
export interface ServicePlugin {
  /** 启动服务，接收运行时上下文 */
  start(context: ServiceContext): Promise<void>
  /** 停止服务，清理资源 */
  stop(): Promise<void>
  /** 可选：返回运行状态信息 */
  getStatus?(): { running: boolean; info?: Record<string, unknown> }
}

// ── ServiceManager 内部类型 ───────────────────────────────────────────────

/** 活跃 service 记录 */
export interface ActiveServiceRecord {
  pluginId: string
  instance: ServicePlugin
  context: ServiceContext
  startedAt: number
}
