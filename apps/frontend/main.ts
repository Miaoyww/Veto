import { mount } from 'svelte'

import App from './routes/index.svelte'

// ── 插件日志 → DevTools console ─────────────────────────────────────────
// 插件（如 veto.ws-relay）以独立进程运行，它们的 console.log 输出到
// 主进程终端而非 DevTools。主进程通过 IPC 将插件日志转发为
// 'plugin:log' 事件，此处监听并输出到 DevTools console。
if (typeof window !== 'undefined' && window.veto?.events) {
  const LOG_STYLES: Record<string, string> = {
    log: 'color: #4fc3f7',
    error: 'color: #ef5350; font-weight: bold',
  }

  window.veto.events.on('plugin:log', (data: any) => {
    const { pluginId, level = 'log', message } = data ?? {}
    const style = LOG_STYLES[level] ?? ''
    const method: 'log' | 'error' = level === 'error' ? 'error' : 'log'
    console[method](`%c[${pluginId}]%c ${message}`, style, '')
  })

  // ── 主进程日志 → DevTools console ─────────────────────────────────────
  // logger.ts 通过 log.hooks 将所有主进程日志通过 IPC 转发，
  // event 类型为 'main:log'，此处监听并输出到 DevTools console。
  const MAIN_LOG_STYLES: Record<string, string> = {
    log: 'color: #81c784',
    warn: 'color: #ffb74d',
    error: 'color: #ef5350; font-weight: bold',
    debug: 'color: #90a4ae',
  }

  window.veto.events.on('main:log', (data: any) => {
    const { level = 'log', tag = '', message } = data ?? {}
    const style = MAIN_LOG_STYLES[level] ?? ''
    const method: 'log' | 'warn' | 'error' | 'debug' =
      level === 'error' ? 'error' : level === 'warn' ? 'warn' : level === 'debug' ? 'debug' : 'log'
    console[method](`%c${tag}%c ${message}`, style, '')
  })
}

const app = mount(App, {
  target: document.getElementById('app')!
})

export default app
