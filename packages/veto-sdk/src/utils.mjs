/**
 * @veto/sdk — utils.mjs
 *
 * 事件模式匹配等工具函数。
 */

/**
 * 检查事件类型是否匹配模式。
 *
 * 支持通配符 `*`：
 * - `'conference:*'` 匹配 `'conference:phase_changed'`
 * - `'conference:speaker_*'` 匹配 `'conference:speaker_started'`
 * - `'*'` 匹配所有
 * - 精确字符串优先匹配
 *
 * @param {string} pattern - 事件模式
 * @param {string} eventType - 实际事件类型
 * @returns {boolean}
 */
export function matchEvent(pattern, eventType) {
  if (pattern === eventType) return true
  if (pattern === '*') return true

  // 转义正则特殊字符，但保留 * 为 .*
  const regexStr = '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
  try {
    return new RegExp(regexStr).test(eventType)
  } catch {
    return false
  }
}

/**
 * 从环境变量创建默认的 VetoClientOptions。
 * @param {string} [pluginId] - 插件 ID
 * @param {string} [pluginDir] - 插件目录
 * @returns {import('./types.d.ts').VetoClientOptions}
 */
export function defaultOptions(pluginId, pluginDir) {
  return {
    port: parseInt(process.env.VETO_WS_PORT ?? '19528'),
    host: '127.0.0.1',
    autoConnect: true,
    reconnect: true,
    reconnectInterval: 3000,
    pluginId: pluginId ?? process.env.VETO_PLUGIN_ID ?? '',
    pluginDir: pluginDir ?? process.env.VETO_PLUGIN_DIR ?? '',
  }
}
