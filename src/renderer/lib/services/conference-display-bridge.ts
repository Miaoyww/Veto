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

const WS_URL = 'ws://localhost:19527'

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

let _ws: WebSocket | null = null
let _wsListeners: Array<(data: ConferenceDisplayData) => void> = []
let _pendingMessages: ConferenceDisplayData[] = []

function getWs(): WebSocket {
  if (_ws && _ws.readyState === WebSocket.OPEN) return _ws

  _ws = new WebSocket(WS_URL)

  _ws.onopen = () => {
    // 发送积压消息
    for (const msg of _pendingMessages) {
      _ws!.send(JSON.stringify({ type: 'host', data: msg }))
    }
    _pendingMessages = []
  }

  _ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ConferenceDisplayData
      for (const cb of _wsListeners) {
        cb(data)
      }
    } catch {
      // ignore
    }
  }

  _ws.onclose = () => {
    _ws = null
    // 自动重连（1秒后）
    setTimeout(() => {
      if (!_ws || _ws.readyState !== WebSocket.OPEN) {
        getWs()
      }
    }, 1000)
  }

  return _ws
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
  extra?: { rollCall?: ConferenceDisplayData['rollCall'] }
): ConferenceDisplayData {
  // 当前发言人
  const currentSpeakerEntry = conf.activeSpeaker
    ? conf.speakersList.find((s) => s.id === conf.activeSpeaker?.entryId)
    : null
  const currentSpeakerDel = currentSpeakerEntry
    ? conf.delegations.find((d) => d.id === currentSpeakerEntry.delegationId)
    : null

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

  // 磋商计时
  let caucusData: ConferenceDisplayData['caucusTimer'] | undefined
  if (conf.activeCaucus) {
    const now = Date.now()
    caucusData = {
      remainingSec: Math.max(0, (conf.activeCaucus.endAt - now) / 1000),
      totalSec: (conf.activeCaucus.endAt - conf.activeCaucus.startedAt) / 1000,
      type: conf.activeCaucus.type,
      topic: conf.motions.find((m) => m.id === conf.activeCaucus?.motionId)?.type === 'moderated_caucus'
        ? (conf.motions.find((m) => m.id === conf.activeCaucus?.motionId) as any)?.topic
        : undefined
    }
  }

  return {
    conferenceId: conf.id,
    phase: conf.phase,
    venue: conf.venue,
    name: conf.name,
    currentSpeaker: currentSpeakerEntry && currentSpeakerDel
      ? {
          delegationName: currentSpeakerDel.name,
          shortName: currentSpeakerDel.shortName,
          remainingSec: conf.activeSpeaker
            ? Math.max(0, (conf.activeSpeaker.endAt - Date.now()) / 1000)
            : 0,
          allocatedSec: currentSpeakerEntry.allocatedTimeSec,
          isPaused: conf.activeSpeaker?.pausedAt != null
        }
      : undefined,
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
    activeMotion: pendingMotion
      ? {
          type: pendingMotion.type,
          topic: pendingMotion.type === 'moderated_caucus' ? (pendingMotion as any).topic : undefined,
          status: pendingMotion.status,
          proposedByName: pendingMotionDel?.name ?? pendingMotion.proposedByDelegationId
        }
      : undefined,
    caucusTimer: caucusData,
    recentMinutes: conf.minutes.slice(-10).map((m) => ({
      timestamp: m.timestamp,
      eventType: m.eventType,
      description: m.description
    })),
    rollCall: extra?.rollCall
  }
}
