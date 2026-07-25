/**
 * conference-display-bridge.ts
 * ──────────────────────────────────────────────
 * Display 窗口通信抽象层。
 *
 * 使用 WebSocket 协议：主进程运行 WS server (ws://localhost:19527)，
 * Host 和 Display 窗口都通过浏览器原生 WebSocket 连接。
 *
 * Host 端：连接后发送 { type: "host", data } → 服务器广播给所有 Display
 * Display 端：连接后接收服务器广播的消息
 */

import type { ConferenceDisplayData } from '$lib/types-conference'

const DEFAULT_WS_URL = 'ws://localhost:19527'

/** 当前 WS 连接地址（可由外部 IPC 消息更新） */
let _currentWsUrl: string | null = null

export function getWsUrl(): string {
  return _currentWsUrl || DEFAULT_WS_URL
}

/** 更新 WS 地址并重连（仅展示模式由 IPC 触发） */
export function setExternalWsUrl(url: string): void {
  if (_currentWsUrl === url) return
  _currentWsUrl = url
  console.log('[DisplayBridge] External WS URL set:', url)
  // 断开当前连接并重连
  if (_ws) {
    _ws.close()
    _ws = null
  }
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer)
    _reconnectTimer = null
  }
  _reconnectDelay = 1000
  getWs()
}

// ---- 抽象接口 ------------------------------------------------------------

export interface ConferenceDisplayBridge {
  /** 打开显示窗口（通过 Electron IPC，因为需要创建 BrowserWindow） */
  openDisplay(conferenceId: string): Promise<boolean>
  /** 关闭显示窗口 */
  closeDisplay(): Promise<void>
  /** 推送显示数据（Host 端通过 WebSocket 发送） */
  sendUpdate(data: ConferenceDisplayData): void
  /** 监听数据更新（Display 端通过 WebSocket 接收） */
  onHostCommand(callback: (data: ConferenceDisplayData) => void): () => void
}

// ---- 共享 WebSocket 连接 ----

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

let _ws: WebSocket | null = null
let _wsListeners: Array<(data: ConferenceDisplayData) => void> = []
let _statusListeners: Array<(status: ConnectionStatus) => void> = []
let _pendingMessages: ConferenceDisplayData[] = []
let _reconnectDelay = 1000
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null

function setStatus(status: ConnectionStatus): void {
  for (const cb of _statusListeners) {
    cb(status)
  }
}

function getWs(): WebSocket {
  if (_ws && _ws.readyState === WebSocket.OPEN) {
    setStatus('connected')
    return _ws
  }

  // 清除已有重连定时器
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer)
    _reconnectTimer = null
  }

  setStatus('connecting')
  _ws = new WebSocket(getWsUrl())

  _ws.onopen = () => {
    setStatus('connected')
    console.log('[DisplayBridge] WebSocket connected')
    _reconnectDelay = 1000 // 重置退避
    // 发送积压消息
    for (const msg of _pendingMessages) {
      _ws!.send(JSON.stringify({ type: 'host', data: msg }))
    }
    _pendingMessages = []
  }

  _ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ConferenceDisplayData
      console.log('[DisplayBridge] WS message received:', {
        phase: data.phase,
        speaker: data.currentSpeaker?.remainingSec,
        caucus: data.caucusTimer?.remainingSec
      })
      for (const cb of _wsListeners) {
        cb(data)
      }
    } catch {
      // ignore
    }
  }

  _ws.onerror = () => {
    // 连接失败由 onclose 处理（error 后必然 close）
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

/** 获取当前 WebSocket 连接状态 */
function currentStatus(): ConnectionStatus {
  if (!_ws) return 'disconnected'
  if (_ws.readyState === WebSocket.OPEN) return 'connected'
  if (_ws.readyState === WebSocket.CONNECTING) return 'connecting'
  return 'disconnected'
}

/** 监听 WebSocket 连接状态变化（供 Display 端显示连接状态） */
export function onConnectionStatus(callback: (status: ConnectionStatus) => void): () => void {
  _statusListeners.push(callback)
  // 立即通知当前状态（解决 HMR 后状态丢失问题）
  callback(currentStatus())
  return () => {
    _statusListeners = _statusListeners.filter((cb) => cb !== callback)
  }
}

// ---- Host 桥接 ----

function createHostBridge(): ConferenceDisplayBridge {
  return {
    openDisplay: async (conferenceId: string): Promise<boolean> => {
      if (typeof window === 'undefined' || !window.veto?.conference) return false
      const result = await window.veto.conference.openDisplay(conferenceId)
      return result.success
    },

    closeDisplay: async (): Promise<void> => {
      if (typeof window === 'undefined' || !window.veto?.conference) return
      await window.veto.conference.closeDisplay()
    },

    sendUpdate: (data: ConferenceDisplayData): void => {
      const ws = getWs()
      const payload = JSON.stringify({ type: 'host', data })
      console.log('[DisplayBridge] sendUpdate →', {
        phase: data.phase,
        speaker: data.currentSpeaker?.remainingSec,
        caucus: data.caucusTimer?.remainingSec
      })
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      } else {
        _pendingMessages.push(data)
      }
    },

    onHostCommand: (): (() => void) => {
      // Host 端不接收 Display 消息
      return () => {}
    }
  }
}

// ---- Display 桥接 ----

function createDisplayBridge(): ConferenceDisplayBridge {
  return {
    openDisplay: async (): Promise<boolean> => false,
    closeDisplay: async (): Promise<void> => {},

    sendUpdate: (): void => {
      // Display 端不发送更新
    },

    onHostCommand: (callback: (data: ConferenceDisplayData) => void): (() => void) => {
      _wsListeners.push(callback)
      // 确保 WebSocket 已连接
      getWs()
      return () => {
        _wsListeners = _wsListeners.filter((cb) => cb !== callback)
      }
    }
  }
}

// ---- 单例 ----------------------------------------------------------------

let currentBridge: ConferenceDisplayBridge | null = null

export function getDisplayBridge(): ConferenceDisplayBridge {
  if (!currentBridge) {
    // 根据 URL 判断是 Host 还是 Display
    const isDisplay = typeof window !== 'undefined' &&
      (window.location.hash.includes('conference-display') ||
       window.location.pathname.includes('conference-display'))
    currentBridge = isDisplay ? createDisplayBridge() : createHostBridge()
  }
  return currentBridge
}

/** 替换 bridge 实现（测试用） */
export function setDisplayBridge(bridge: ConferenceDisplayBridge): void {
  currentBridge = bridge
}

// ---- 辅助：从 Conference 构建 DisplayData --------------------------------

import type { Conference } from '$lib/types-conference'
import { tallyVotes } from '$lib/stores/conference/conference-store'
import { calculateMajorityThresholds } from '$lib/engine/conference-engine'

export function buildDisplayData(
  conf: Conference,
  extra?: {
    rollCall?: ConferenceDisplayData['rollCall']
    motionDraft?: ConferenceDisplayData['motionDraft']
    speakerTransition?: 'timeout' | 'ended'
  }
): ConferenceDisplayData {
  // 当前发言人
  let currentSpeakerName: string | undefined
  let currentSpeakerAllocatedSec = 120

  if (conf.activeSpeaker) {
    // 先检查主发言名单
    const entry = conf.speakersList.find((s) => s.id === conf.activeSpeaker!.entryId)
    if (entry) {
      const del = conf.delegations.find((d) => d.id === entry.delegationId)
      currentSpeakerName = del?.name ?? entry.delegationId
      currentSpeakerAllocatedSec = entry.allocatedTimeSec
    } else if (conf.activeCaucus?.caucusSpeakers) {
      // 在磋商发言名单中查找
      const cs = conf.activeCaucus.caucusSpeakers.find(
        (s) => s.delegationId === conf.activeSpeaker!.entryId && s.status === 'speaking'
      )
      if (cs) {
        currentSpeakerName = cs.delegationName
        currentSpeakerAllocatedSec = cs.allocatedTimeSec
      }
    }
  }

  // 当前投票
  const activeVoting = conf.votingSessions.find((s) => !s.endedAt)
  let votingData: ConferenceDisplayData['votingSession'] | undefined
  if (activeVoting) {
    const tally = tallyVotes(activeVoting.ballots)
    const thresholds = calculateMajorityThresholds(conf.delegations)
    votingData = {
      targetDescription: activeVoting.targetType === 'motion' ? '动议' : '决议草案',
      majorityRule: activeVoting.majorityRule === 'simple_majority' ? '简单多数' : '2/3多数',
      tally: { ...tally, present: thresholds.presentCount },
      result: activeVoting.result
    }
  }

  // 当前动议
  const pendingMotion = conf.motions.find((m) => m.status === 'pending')
  const pendingMotionDel = pendingMotion
    ? conf.delegations.find((d) => d.id === pendingMotion.proposedByDelegationId)
    : null

  // 最近被处理的动议（通过/否决），用于 Display 展示表决结果
  // 仅在动议阶段已结束（非 editing / voting）时才回退到已处理的动议，
  // 避免进入新一轮 editing 时错误展示上一次的表决结果
  const hasActiveMotionPhase =
    extra?.motionDraft?.proposedByName || conf.motions.some((m) => m.status === 'pending')
  const resolvedMotions = conf.motions.filter(
    (m) =>
      (m.status === 'approved' || m.status === 'rejected') &&
      !conf.dismissedResolvedMotionIds.includes(m.id)
  )
  const lastResolvedMotion =
    resolvedMotions.length > 0 ? resolvedMotions[resolvedMotions.length - 1] : undefined
  const displayMotion = pendingMotion ?? (!hasActiveMotionPhase ? lastResolvedMotion : undefined)
  const displayMotionDel =
    displayMotion && displayMotion !== pendingMotion
      ? conf.delegations.find((d) => d.id === displayMotion.proposedByDelegationId)
      : pendingMotionDel

  // 磋商计时
  let caucusData: ConferenceDisplayData['caucusTimer'] | undefined
  if (conf.activeCaucus) {
    const now = Date.now()
    const remainingSec = Math.max(0, (conf.activeCaucus.endAt - now) / 1000)
    const totalSec = (conf.activeCaucus.endAt - conf.activeCaucus.startedAt) / 1000
    const status = (conf.activeCaucus?.pausedAt != null || conf.activeSpeaker?.pausedAt != null) ? 'paused' as const : 'running' as const
    caucusData = {
      remainingSec,
      totalSec,
      type: conf.activeCaucus.type,
      status,
      topic: conf.motions.find((m) => m.id === conf.activeCaucus?.motionId)?.type === 'moderated_caucus'
        ? (conf.motions.find((m) => m.id === conf.activeCaucus?.motionId) as any)?.topic
        : undefined,
      caucusSpeakers: conf.activeCaucus.caucusSpeakers?.map((s) => ({
        delegationName: s.delegationName,
        status: s.status,
        allocatedTimeSec: s.allocatedTimeSec
      })),
      currentSpeakerIndex: conf.activeCaucus.currentSpeakerIndex,
      speakerTransition: extra?.speakerTransition
    }
  }

  // 动议活跃时覆盖 phase 为 'motion'（Display 专用）
  const effectivePhase: Conference['phase'] | 'motion' =
    hasActiveMotionPhase ? 'motion' : conf.phase

  return {
    conferenceId: conf.id,
    phase: effectivePhase,
    venue: conf.venue,
    name: conf.name,
    currentSpeaker: (() => {
      if (!currentSpeakerName) return undefined
      const now = Date.now()
      const remainingSec = conf.activeSpeaker
        ? Math.max(0, (conf.activeSpeaker.endAt - now) / 1000)
        : 0
      const status = conf.activeSpeaker?.pausedAt != null ? 'paused' as const : 'playing' as const
      return {
        delegationName: currentSpeakerName,
        remainingSec,
        allocatedSec: currentSpeakerAllocatedSec,
        status
      }
    })(),
    readySpeaker: (() => {
      const ready = conf.speakersList.find((s) => s.status === 'ready')
      if (!ready) return undefined
      const d = conf.delegations.find((del) => del.id === ready.delegationId)
      return d ? { delegationName: d.name, shortName: d.shortName } : undefined
    })(),
    speakersList: conf.speakersList.map((s) => {
      const d = conf.delegations.find((del) => del.id === s.delegationId)
      return {
        delegationName: d?.name ?? s.delegationId,
        shortName: d?.shortName,
        status: s.status
      }
    }),
    votingSession: votingData,
    activeMotion: displayMotion
      ? {
          type: displayMotion.type,
          topic: displayMotion.type === 'moderated_caucus' ? (displayMotion as any).topic : undefined,
          status: displayMotion.status,
          proposedByName: displayMotionDel?.name ?? displayMotion.proposedByDelegationId,
          motionId: displayMotion.id,
          totalTimeSec:
            displayMotion.type === 'moderated_caucus'
              ? (displayMotion as any).totalTimeSec
              : displayMotion.type === 'unmoderated_caucus'
                ? (displayMotion as any).durationSec
                : undefined,
          speakingTimePerPersonSec:
            displayMotion.type === 'moderated_caucus'
              ? (displayMotion as any).speakingTimePerPersonSec
              : undefined,
          newTimeSec:
            displayMotion.type === 'modify_speaking_time'
              ? (displayMotion as any).newTimeSec
              : undefined
        }
      : undefined,
    caucusTimer: caucusData,
    caucusSetup: conf.caucusSetup
      ? (() => {
          const csMotion = conf.motions.find((m) => m.id === conf.caucusSetup!.motionId) as any
          const proposerId = csMotion?.proposedByDelegationId
          const proposerDel = proposerId ? conf.delegations.find((d) => d.id === proposerId) : null
          return {
          topic: csMotion?.topic,
          proposerName: proposerDel?.name,
          proposerPosition: conf.caucusSetup!.proposerPosition,
          speakerDelegationIds: conf.caucusSetup!.speakerDelegationIds,
          speakerNames: conf.caucusSetup!.speakerDelegationIds.map(
            (id) => conf.delegations.find((d) => d.id === id)?.name ?? id
          )
        }
      })()
      : undefined,
    recentMinutes: conf.minutes.slice(-10).map((m) => ({
      timestamp: m.timestamp,
      eventType: m.eventType,
      description: m.description
    })),
    yieldPending: conf.yieldPending
      ? {
          yieldType: conf.yieldPending.yieldType,
          originalDelegationName: conf.yieldPending.originalDelegationName,
          remainingSec: Math.round(conf.yieldPending.remainingSec),
          questionerDelegationName: conf.yieldPending.questionerDelegationName
        }
      : undefined,
    rollCall: extra?.rollCall,
    motionDraft: extra?.motionDraft
  }
}
