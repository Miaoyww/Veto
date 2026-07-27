/**
 * @veto/sdk — Plugin SDK
 *
 * Service 插件与 Veto Core 通信的统一入口。
 *
 * 使用:
 *   import { VetoClient } from '@veto/sdk'
 *   const client = new VetoClient({ pluginId: 'veto.qq-bot' })
 *   await client.connect()
 *   client.on('conference:phase_changed', (e) => { ... })
 *   const confs = await client.queryConferences()
 */

export { VetoClient } from './client.mjs'
export { matchEvent, defaultOptions } from './utils.mjs'
export { WsTransport, QueryClient } from './transport.mjs'
