/**
 * @veto/sdk — TypeScript 声明入口
 *
 * 主进程 TypeScript 通过这些声明获得类型检查。
 */
export type {
  ConferenceEventType,
  TimelineEventType,
  ServiceEventType,
  ServiceEventPayload,
  TimelineSummary,
  MinutesEntry,
  ConferenceSummary,
  VetoClientOptions,
  VetoClientStatus,
  EventHandler,
} from './types.d'

export { VetoClient } from './client.mjs'
export { matchEvent, defaultOptions } from './utils.mjs'
export { WsTransport, QueryClient } from './transport.mjs'
