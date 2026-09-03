/**
 * delegate-bridge.ts — 代表端 WebSocket 通信抽象层
 *
 * 双模式设计（参考 conference-display-bridge.ts 的模式）：
 * - Chair 端：连接自己的 WS server，发送状态 + 接收代表消息
 * - Delegate 端：连接远程 Chair WS，接收状态 + 发送操作
 *
 * 核心区别：
 * - Display Bridge 是 Host 写 → Display 读（单向）
 * - Delegate Bridge 是 Chair ↔ Delegate（双向）
 * - Delegate Bridge 需要 auth 握手
 * - Chair Bridge 需要接收 Delegate 的写操作并更新引擎
 */

import type {
  ConferenceDisplayData,
  TimerTickData
} from '$lib/classes/types/conference'
import type {
  SeatGroup,
  Directive,
  News,
  SituationUpdate,
  Seat,
  Capability,
  CabinetMode
} from '$lib/classes/types/delegate'

const DEFAULT_WS_PORT = 19527

/** 会议全量同步数据 */
export interface ConferenceSyncData {
  conferenceId: string
  displayData: ConferenceDisplayData
  seatGroups: SeatGroup[]
  seats: Seat[]
  directives: Directive[]
  news: News[]
  situationUpdates: SituationUpdate[]
  myCapabilities: Capability[]
}

// ---- WS 地址管理 -------------------------------------------------------

let _wsPort: number | null = null

export async function initWsPort(): Promise<number> {
  if (_wsPort !== null) return _wsPort
  if (typeof window !== 'undefined' && window.veto?.ws) {
    const port = await window.veto.ws.getPort()
    _wsPort = port
    return port
  }
  _wsPort = DEFAULT_WS_PORT
  return _wsPort
}

export function getWsPort(): number {
  return _wsPort ?? DEFAULT_WS_PORT
}

function buildDefaultWsUrl(): string {
  return `ws://localhost:${_wsPort ?? DEFAULT_WS_PORT}`
}

let _currentWsUrl: string | null = null

export function getWsUrl(): string {
  return _currentWsUrl || buildDefaultWsUrl()
}

export function setExternalWsUrl(url: string): void {
  if (_currentWsUrl === url) return
  _currentWsUrl = url
  disconnect()
}

// ---- 连接状态 ------------------------------------------------------------

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

// ---- 回调类型 ------------------------------------------------------------

export interface DelegateBridgeCallbacks {
  onConferenceSync?: (data: ConferenceSyncData) => void
  onTimerTick?: (data: TimerTickData) => void
  onDirectiveUpdated?: (directive: Directive) => void
  onNewsUpdated?: (news: News) => void
  onSituationCreated?: (update: SituationUpdate) => void
  onModeChange?: (seatGroupId: string, mode: CabinetMode) => void
  onAuthResult?: (result: { success: boolean; error?: string; seat?: Seat; capabilities?: Capability[] }) => void
  onConnectionStatus?: (status: ConnectionStatus) => void
}

// ---- Delegate Bridge 接口 ------------------------------------------------

export interface DelegateBridge {
  /** Chair 端：发送全量同步数据 */
  sendConferenceSync(data: ConferenceSyncData): void
  /** Chair 端：发送计时器 tick */
  sendTimerTick(data: TimerTickData): void
  /** Chair 端：发送模式切换通知 */
  sendModeChange(seatGroupId: string, mode: CabinetMode): void
  /** Chair 端：发送指令更新 */
  sendDirectiveUpdated(directive: Directive): void
  /** Chair 端：发送新闻更新 */
  sendNewsUpdated(news: News): void
  /** Chair 端：发送局势更新 */
  sendSituationCreated(update: SituationUpdate): void
  /** Delegate 端：通过邀请码+密码认证 */
  authenticate(inviteCode: string, password: string): void
  /** Delegate 端：提交指令 */
  createDirective(data: Partial<Directive>): void
  /** Delegate 端：更新指令 */
  updateDirective(data: Partial<Directive>): void
  /** Delegate 端：创建新闻 */
  createNews(data: Partial<News>): void
  /** Delegate 端：更新新闻 */
  updateNews(data: Partial<News>): void
  /** Delegate 端：提交新闻审核 */
  submitNews(newsId: string): void
  /** 注册回调 */
  setCallbacks(callbacks: DelegateBridgeCallbacks): void
  /** 断开连接 */
  disconnect(): void
}

// ---- 共享 WebSocket 连接 -------------------------------------------------

let _ws: WebSocket | null = null
let _callbacks: DelegateBridgeCallbacks = {}
let _statusListeners: Array<(status: ConnectionStatus) => void> = []
let _reconnectDelay = 1000
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null
let _pendingAuth: { inviteCode: string; password: string } | null = null
let _mode: 'chair' | 'delegate' | 'none' = 'none'

function setStatus(status: ConnectionStatus): void {
  for (const cb of _statusListeners) {
    cb(status)
  }
  _callbacks.onConnectionStatus?.(status)
}

function currentStatus(): ConnectionStatus {
  if (!_ws) return 'disconnected'
  if (_ws.readyState === WebSocket.OPEN) return 'connected'
  if (_ws.readyState === WebSocket.CONNECTING) return 'connecting'
  return 'disconnected'
}

function getWs(): WebSocket {
  if (_ws && _ws.readyState === WebSocket.OPEN) {
    setStatus('connected')
    return _ws
  }

  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer)
    _reconnectTimer = null
  }

  setStatus('connecting')
  _ws = new WebSocket(getWsUrl())

  _ws.onopen = () => {
    setStatus('connected')
    console.log('[DelegateBridge] WebSocket connected, mode:', _mode)
    _reconnectDelay = 1000

    // Chair 模式：发送 chair 身份认证
    if (_mode === 'chair') {
      _ws!.send(JSON.stringify({ type: 'auth', clientType: 'chair' }))
    }

    // Delegate 模式：重新发送 auth（断线重连）
    if (_mode === 'delegate' && _pendingAuth) {
      _ws!.send(
        JSON.stringify({
          type: 'auth',
          inviteCode: _pendingAuth.inviteCode,
          password: _pendingAuth.password,
          clientType: 'delegate'
        })
      )
    }
  }

  _ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      handleMessage(msg)
    } catch {
      // ignore
    }
  }

  _ws.onerror = () => {
    // 连接失败由 onclose 处理
  }

  _ws.onclose = () => {
    _ws = null
    setStatus('disconnected')
    // 自动重连（指数退避：1s → 2s → 4s → … → max 10s）
    _reconnectTimer = setTimeout(() => {
      if (!_ws || _ws.readyState !== WebSocket.OPEN) {
        getWs()
      }
    }, _reconnectDelay)
    _reconnectDelay = Math.min(_reconnectDelay * 2, 10000)
  }

  return _ws
}

function handleMessage(msg: Record<string, unknown>): void {
  const type = msg.type as string

  switch (type) {
    case 'auth_result':
      _callbacks.onAuthResult?.({
        success: msg.success as boolean,
        error: msg.error as string | undefined,
        seat: msg.seat as Seat | undefined,
        capabilities: msg.capabilities as Capability[] | undefined
      })
      break

    case 'conference_sync':
      _callbacks.onConferenceSync?.(msg.data as ConferenceSyncData)
      break

    case 'timer_tick':
      _callbacks.onTimerTick?.(msg.data as TimerTickData)
      break

    case 'directive:updated':
    case 'directive:status_changed':
      _callbacks.onDirectiveUpdated?.(msg.data as Directive)
      break

    case 'news:updated':
    case 'news:published':
    case 'news:retracted':
      _callbacks.onNewsUpdated?.(msg.data as News)
      break

    case 'situation:created':
    case 'situation:updated':
      _callbacks.onSituationCreated?.(msg.data as SituationUpdate)
      break

    case 'mode_change':
      _callbacks.onModeChange?.(
        msg.seatGroupId as string,
        msg.mode as CabinetMode
      )
      break

    case 'delegate_error':
      console.error('[DelegateBridge] Error:', msg.code, msg.message)
      break
  }
}

function disconnect(): void {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer)
    _reconnectTimer = null
  }
  if (_ws) {
    _ws.close()
    _ws = null
  }
  _mode = 'none'
  _pendingAuth = null
  setStatus('disconnected')
}

// ---- Chair 桥接 ----------------------------------------------------------

function createChairBridge(): DelegateBridge {
  _mode = 'chair'

  return {
    sendConferenceSync: (data: ConferenceSyncData): void => {
      const ws = getWs()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'conference_sync', data }))
      }
    },

    sendTimerTick: (data: TimerTickData): void => {
      const ws = getWs()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'timer_tick', data }))
      }
      // tick 消息不积压
    },

    sendModeChange: (seatGroupId: string, mode: CabinetMode): void => {
      const ws = getWs()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'mode_change', seatGroupId, mode }))
      }
    },

    sendDirectiveUpdated: (directive: Directive): void => {
      const ws = getWs()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'directive:updated', data: directive }))
      }
    },

    sendNewsUpdated: (news: News): void => {
      const ws = getWs()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'news:updated', data: news }))
      }
    },

    sendSituationCreated: (update: SituationUpdate): void => {
      const ws = getWs()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'situation:created', data: update }))
      }
    },

    authenticate: (): void => {
      // Chair 端不需要密码认证，在 onopen 中自动认证
    },

    createDirective: (): void => {},
    updateDirective: (): void => {},
    createNews: (): void => {},
    updateNews: (): void => {},
    submitNews: (): void => {},

    setCallbacks: (callbacks: DelegateBridgeCallbacks): void => {
      _callbacks = callbacks
    },

    disconnect
  }
}

// ---- Delegate 桥接 -------------------------------------------------------

function createDelegateBridge(): DelegateBridge {
  _mode = 'delegate'

  return {
    sendConferenceSync: (): void => {
      // Delegate 端不发送同步数据
    },

    sendTimerTick: (): void => {
      // Delegate 端不发送 tick
    },

    sendModeChange: (): void => {},
    sendDirectiveUpdated: (): void => {},
    sendNewsUpdated: (): void => {},
    sendSituationCreated: (): void => {},

    authenticate: (inviteCode: string, password: string): void => {
      _pendingAuth = { inviteCode, password }
      const ws = getWs()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'auth',
            inviteCode,
            password,
            clientType: 'delegate'
          })
        )
      }
      // 如果未连接，getWs() 会触发连接，onopen 中会发送 pending auth
    },

    createDirective: (data: Partial<Directive>): void => {
      const ws = getWs()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'directive:create', data }))
      }
    },

    updateDirective: (data: Partial<Directive>): void => {
      const ws = getWs()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'directive:update', data }))
      }
    },

    createNews: (data: Partial<News>): void => {
      const ws = getWs()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'news:create', data }))
      }
    },

    updateNews: (data: Partial<News>): void => {
      const ws = getWs()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'news:update', data }))
      }
    },

    submitNews: (newsId: string): void => {
      const ws = getWs()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'news:submit', newsId }))
      }
    },

    setCallbacks: (callbacks: DelegateBridgeCallbacks): void => {
      _callbacks = callbacks
    },

    disconnect
  }
}

// ---- 单例 -----------------------------------------------------------------

let currentBridge: DelegateBridge | null = null

export function getDelegateBridge(): DelegateBridge {
  if (!currentBridge) {
    const isDelegate =
      typeof window !== 'undefined' &&
      (window.location.hash.includes('/delegate/') ||
        window.location.pathname.includes('/delegate/'))
    currentBridge = isDelegate ? createDelegateBridge() : createChairBridge()
  }
  return currentBridge
}

/** 替换 bridge 实现（测试用） */
export function setDelegateBridge(bridge: DelegateBridge): void {
  currentBridge = bridge
}

// ---- Chair 端辅助：接收 Delegate 消息 → 写入引擎 -------------------------

/**
 * 注册 Chair 端回调，将 Delegate 的写操作路由到 store。
 * 在 Chair 端初始化时调用。
 */
export function setupChairDelegateReceiver(handlers: {
  onDirectiveCreate: (data: Partial<Directive>) => void
  onDirectiveUpdate: (data: Partial<Directive>) => void
  onNewsCreate: (data: Partial<News>) => void
  onNewsUpdate: (data: Partial<News>) => void
  onNewsSubmit: (newsId: string) => void
}): void {
  // 在 Chair 模式时，通过底层 WS onmessage 路由这些消息类型
  const originalOnMessage = _callbacks

  _callbacks = {
    ...originalOnMessage,
    // 扩展回调以处理来自 Delegate 的写消息
  }

  // 注册一个 handler 拦截 raw WS messages
  const ws = getWs()
  const origOnMessage = ws.onmessage
  ws.onmessage = (event) => {
    // 先调用原有 handler
    origOnMessage?.call(ws, event)

    // 再解析并路由 delegate 写操作
    try {
      const msg = JSON.parse(event.data)
      switch (msg.type) {
        case 'directive:create':
          handlers.onDirectiveCreate(msg.data)
          break
        case 'directive:update':
          handlers.onDirectiveUpdate(msg.data)
          break
        case 'news:create':
          handlers.onNewsCreate(msg.data)
          break
        case 'news:update':
          handlers.onNewsUpdate(msg.data)
          break
        case 'news:submit':
          handlers.onNewsSubmit(msg.newsId)
          break
      }
    } catch {
      // ignore
    }
  }
}

/** 监听连接状态 */
export function onDelegateConnectionStatus(callback: (status: ConnectionStatus) => void): () => void {
  _statusListeners.push(callback)
  callback(currentStatus())
  return () => {
    _statusListeners = _statusListeners.filter((cb) => cb !== callback)
  }
}
