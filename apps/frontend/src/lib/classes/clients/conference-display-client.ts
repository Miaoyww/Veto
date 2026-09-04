/**
 * conference-display-bridge.ts
 * ──────────────────────────────────────────────
 * Display 窗口通信抽象层。
 *
 * 使用 WebSocket 协议：主进程运行 WS server，Host 和 Display 窗口
 * 都通过浏览器原生 WebSocket 连接。端口由主进程自动分配。
 *
 * Host 端：连接后发送 { type: "host", data } → 服务器广播给所有 Display
 * Display 端：连接后接收服务器广播的消息
 */

import type {
  ConferenceDisplayData,
  SpeakerEntryStatus,
  SpeakerTransitionReason,
  CaucusSpeakerStatus,
  TimerTickData
} from '$lib/classes/types/conference'
import { isParticipantSeat, toSeatView, type Seat, type SeatView } from '$lib/classes/types/delegate'

const DEFAULT_WS_PORT = 19527

/** 从主进程查询到的实际 WS 端口（初始化后可用） */
let _wsPort: number | null = null

/** 初始化 WS 端口（从主进程查询，应在应用启动时调用一次） */
export async function initWsPort(): Promise<number> {
  if (_wsPort !== null) return _wsPort
  if (typeof window !== 'undefined' && window.veto?.ws) {
    const port = await window.veto.ws.getPort()
    _wsPort = port
    console.log('[DisplayBridge] WS port from main:', _wsPort)
    return port
  }
  _wsPort = DEFAULT_WS_PORT
  return _wsPort
}

/** 获取当前 WS 端口 */
export function getWsPort(): number {
  return _wsPort ?? DEFAULT_WS_PORT
}

function buildDefaultWsUrl(): string {
  return `ws://localhost:${_wsPort ?? DEFAULT_WS_PORT}`
}

/** 当前 WS 连接地址（可由外部 IPC 消息更新） */
let _currentWsUrl: string | null = null

export function getWsUrl(): string {
  return _currentWsUrl || buildDefaultWsUrl()
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
  /** 推送完整显示数据（Host 端通过 WebSocket 发送，结构变化时调用） */
  sendUpdate(data: ConferenceDisplayData): void
  /** 推送计时器增量数据（Host 端每 tick 发送，Display 端不维护计时器，见 ADR-0002） */
  sendTimerTick(data: TimerTickData): void
  /** 监听完整数据更新（Display 端通过 WebSocket 接收） */
  onHostCommand(callback: (data: ConferenceDisplayData) => void): () => void
  /** 监听计时器增量更新（Display 端，与 onHostCommand 独立） */
  onTimerTick(callback: (data: TimerTickData) => void): () => void
}

// ---- 共享 WebSocket 连接 ----

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

let _ws: WebSocket | null = null
let _wsListeners: Array<(data: ConferenceDisplayData) => void> = []
let _tickListeners: Array<(data: TimerTickData) => void> = []
let _statusListeners: Array<(status: ConnectionStatus) => void> = []
let _pendingMessages: Array<{ type: string; data: unknown }> = []
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
    // 发送积压消息（仅发送最新的全量数据，丢弃过期 tick）
    const lastFull = [..._pendingMessages].reverse().find((m) => m.type !== 'timer_tick')
    if (lastFull) {
      _ws!.send(JSON.stringify(lastFull))
    }
    _pendingMessages = []
  }

  _ws.onmessage = (event) => {
    try {
      const raw = JSON.parse(event.data)
      if (raw.type === 'timer_tick') {
        // 计时器增量消息（ADR-0002）：仅更新 remainingSec/elapsedSec，不重建全量数据
        const tickData = raw.data as TimerTickData
        for (const cb of _tickListeners) {
          cb(tickData)
        }
      } else {
        // host 全量消息 或 向后兼容的无 type 消息
        const data: ConferenceDisplayData =
          raw.type === 'host' ? (raw.data as ConferenceDisplayData) : (raw as ConferenceDisplayData)
        for (const cb of _wsListeners) {
          cb(data)
        }
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
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      } else {
        _pendingMessages.push({ type: 'host', data })
      }
    },

    sendTimerTick: (data: TimerTickData): void => {
      const ws = getWs()
      const payload = JSON.stringify({ type: 'timer_tick', data })
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
      // tick 消息不积压——断线时下一个全量 sendUpdate 会覆盖所有状态
    },

    onHostCommand: (): (() => void) => {
      // Host 端不接收 Display 消息
      return () => {}
    },

    onTimerTick: (): (() => void) => {
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

    sendTimerTick: (): void => {
      // Display 端不发送更新
    },

    onHostCommand: (callback: (data: ConferenceDisplayData) => void): (() => void) => {
      _wsListeners.push(callback)
      // 确保 WebSocket 已连接
      getWs()
      return () => {
        _wsListeners = _wsListeners.filter((cb) => cb !== callback)
      }
    },

    onTimerTick: (callback: (data: TimerTickData) => void): (() => void) => {
      _tickListeners.push(callback)
      getWs()
      return () => {
        _tickListeners = _tickListeners.filter((cb) => cb !== callback)
      }
    }
  }
}

// ---- 单例 ----------------------------------------------------------------

let currentBridge: ConferenceDisplayBridge | null = null

export function getDisplayBridge(): ConferenceDisplayBridge {
  if (!currentBridge) {
    // 根据 URL 判断是 Host 还是 Display
    const isDisplay =
      typeof window !== 'undefined' &&
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

// ---- 辅助：从 Conference / Committee 构建 DisplayData -----------------

import type { Committee as CommitteeDTO } from '$lib/classes/types/conference'
import { tallyVotes } from '$lib/classes/stores/conference/conference-store'
import { calculateMajorityThresholds } from '$lib/classes/services/engine/conference-engine'
import type { Committee } from '$lib/classes/domain/committee.svelte'

/**
 * 构建 Display 窗口数据。
 * 接受 Committee（优先）或 Committee JSON。
 */
export function buildDisplayData(
  source: Committee | CommitteeDTO,
  extra?: {
    rollCall?: ConferenceDisplayData['rollCall']
    motionDraft?: ConferenceDisplayData['motionDraft']
    pointDraft?: ConferenceDisplayData['pointDraft']
    attendanceChange?: ConferenceDisplayData['attendanceChange']
    speakerTransition?: SpeakerTransitionReason
  }
): ConferenceDisplayData {
  // 统一为 Committee JSON 格式
  const conf: CommitteeDTO = 'toJSON' in source ? source.toJSON() : source

  // 如果传入的是引擎，则使用引擎方法获取 seat 信息以优化查找
  const engine: Committee | null = 'toJSON' in source ? source : null
  const findSeat = (seatId: string): Seat | undefined =>
    engine?.getSeat(seatId) ?? conf.seats.find((seat) => seat.id === seatId)
  const findSeatView = (seatId: string): SeatView | undefined => {
    const seat = findSeat(seatId)
    return seat ? toSeatView(seat) : undefined
  }

  // 当前发言人
  let currentSpeakerSeat: Seat | undefined
  let currentSpeakerAllocatedSec = 120

  if (conf.activeSpeaker) {
    // 优先从引擎获取（带 seat 引用）
    const engineEntry = engine?.speakerList.entries.find(
      (s) => s.id === conf.activeSpeaker!.entryId
    )
    if (engineEntry) {
      currentSpeakerSeat = conf.seats.find((d) => d.id === engineEntry.seatId)
      currentSpeakerAllocatedSec = engineEntry.allocatedTimeSec
    } else {
      // 回退：从 conf 数据查找
      const entry = conf.speakerLists?.entries.find((s) => s.id === conf.activeSpeaker!.entryId)
      if (entry) {
        const del = conf.seats.find((d) => d.id === entry.seatId)
        currentSpeakerSeat = del
        currentSpeakerAllocatedSec = entry.allocatedTimeSec
      } else if (conf.activeCaucus?.caucusSpeakers) {
        const cs = conf.activeCaucus.caucusSpeakers.find(
          (s) => s.seatId === conf.activeSpeaker!.entryId && s.status === 'speaking'
        )
        if (cs) {
          currentSpeakerSeat = conf.seats.find((d) => d.id === cs.seatId)
          currentSpeakerAllocatedSec = cs.allocatedTimeSec
        }
      }
    }
  }

  // 当前投票：优先进行中的，否则回退到最近一次已结束的（展示结果）
  const activeVoting =
    conf.votingSessions.find((s) => !s.endedAt) ??
    (() => {
      const ended = conf.votingSessions
        .filter((s) => s.endedAt)
        .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
      return ended[0]
    })()
  let votingData: ConferenceDisplayData['votingSession'] | undefined
  if (activeVoting) {
    const tally = tallyVotes(activeVoting.ballots)
    const participantSeats = conf.seats.filter(isParticipantSeat)
    const thresholds = calculateMajorityThresholds(participantSeats)

    // 构建每个有投票权的出席席位的投票状态（排除观察员）
    const presentSeats = participantSeats
      .filter((seat) => seat.procedure.attendance === 'present' && seat.procedure.hasVotingRights)
      .sort((a, b) => a.procedure.sortOrder - b.procedure.sortOrder)

    const ballotsDisplay = presentSeats.map((d) => {
      const ballot = activeVoting.ballots.find((b) => b.seatId === d.id)
      return {
        seatId: d.id,
        seatName: d.name,
        shortName: d.procedure.shortName,
        vote: ballot?.vote ?? null
      }
    })

    votingData = {
      targetDescription: activeVoting.targetType === 'motion' ? '动议' : '决议草案',
      majorityRule: activeVoting.majorityRule === 'simple_majority' ? '简单多数' : '2/3多数',
      tally: { ...tally, present: thresholds.presentCount },
      result: activeVoting.result,
      round: activeVoting.round ?? 1,
      currentSeatId: activeVoting.currentSeatId ?? null,
      ballots: ballotsDisplay
    }
  }

  // 当前动议
  const pendingMotion = conf.motions.find((m) => m.status === 'pending')

  // 最近被处理的动议（通过/否决），用于 Display 展示表决结果
  // 仅在动议阶段已结束（非 editing / voting）时才回退到已处理的动议，
  // 避免进入新一轮 editing 时错误展示上一次的表决结果
  // 特殊动议（isRequestingVote: false）不触发动议阶段，避免 Display 展示表决 UI
  const hasActiveMotionPhase =
    extra?.motionDraft?.isRequestingVote === true ||
    conf.motions.some((m) => m.status === 'pending')
  const resolvedMotions = conf.motions.filter(
    (m) =>
      (m.status === 'approved' || m.status === 'rejected') &&
      !conf.dismissedResolvedMotionIds.includes(m.id) &&
      m.type !== 'change_attendance'
  )
  const lastResolvedMotion =
    resolvedMotions.length > 0 ? resolvedMotions[resolvedMotions.length - 1] : undefined
  const displayMotion = pendingMotion ?? (!hasActiveMotionPhase ? lastResolvedMotion : undefined)

  // 磋商计时
  let caucusData: ConferenceDisplayData['caucusTimer'] | undefined
  if (conf.activeCaucus) {
    const remainingSec = Math.max(0, conf.activeCaucus.totalSec - conf.activeCaucus.elapsedSec)
    const totalSec = conf.activeCaucus.totalSec
    const status =
      conf.activeCaucus.paused || (conf.activeSpeaker?.paused ?? false)
        ? ('paused' as const)
        : ('running' as const)
    caucusData = {
      remainingSec,
      totalSec,
      type: conf.activeCaucus.type,
      status,
      topic:
        (() => {
          const motion = conf.motions.find((m) => m.id === conf.activeCaucus?.motionId)
          if (!motion) return undefined
          if (motion.type === 'moderated_caucus') return (motion as any).topic as string | undefined
          if (motion.type === 'individual_speech') {
            return conf.seats.find((seat) => seat.id === motion.proposedBySeatId)?.name
          }
          return undefined
        })(),
      caucusSpeakers: conf.activeCaucus.caucusSpeakers
        ?.map((s) => {
          const seat = conf.seats.find((d) => d.id === s.seatId)
          return seat
            ? {
                seatName: seat.name,
                seat: toSeatView(seat),
                status: s.status as CaucusSpeakerStatus,
                allocatedTimeSec: s.allocatedTimeSec
              }
            : null
        })
        .filter(
          (speaker): speaker is {
            seatName: string
            seat: SeatView
            status: CaucusSpeakerStatus
            allocatedTimeSec: number
          } => speaker !== null
        ),
      currentSpeakerIndex: conf.activeCaucus.currentSpeakerIndex,
      speakerTransition: extra?.speakerTransition
    }
  }

  // 动议活跃时覆盖 phase 为 'motion'（Display 专用）
  const effectivePhase: CommitteeDTO['phase'] | 'motion' = hasActiveMotionPhase
    ? 'motion'
    : conf.phase

  return {
    conferenceId: conf.id,
    phase: effectivePhase,
    venue: conf.name,
    name: conf.name,
    presentCount: conf.seats.filter(isParticipantSeat).filter(
      (seat) => seat.procedure.attendance === 'present'
    ).length,
    votingCount: conf.seats.filter(isParticipantSeat).filter(
      (seat) => seat.procedure.attendance === 'present' && seat.procedure.hasVotingRights
    ).length,
    currentSpeaker: (() => {
      if (!currentSpeakerSeat) return undefined
      const remainingSec = conf.activeSpeaker
        ? Math.max(0, conf.activeSpeaker.totalSec - conf.activeSpeaker.elapsedSec)
        : 0
      const status =
        conf.activeSpeaker?.paused ? ('paused' as const) : ('playing' as const)
      return {
        seat: toSeatView(currentSpeakerSeat),
        remainingSec,
        allocatedSec: currentSpeakerAllocatedSec,
        status
      }
    })(),
    readySpeaker: (() => {
      // 优先从引擎获取（带 seat 引用）
      const engineReady = engine?.readySpeaker
      if (engineReady) {
        const seat = conf.seats.find((d) => d.id === engineReady.seatId)
        return seat ? { seat: toSeatView(seat) } : undefined
      }
      // 回退：从 conf 数据查找
      const ready = conf.speakerLists?.entries.find((s) => s.status === 'ready')
      if (!ready) return undefined
      const d = conf.seats.find((del) => del.id === ready.seatId)
      return d ? { seat: toSeatView(d) } : undefined
    })(),
    speakersList: (() => {
      // 优先从引擎获取
      if (engine) {
        return engine.speakerList.entries
          .map((s) => ({
            seat: conf.seats.find((d) => d.id === s.seatId),
            status: s.status
          }))
          .filter(
            (speaker): speaker is { seat: Seat; status: SpeakerEntryStatus } =>
              speaker.seat !== undefined
          )
          .map((speaker) => ({ ...speaker, seat: toSeatView(speaker.seat) }))
      }
      // 回退：从 conf 数据查找
      return (conf.speakerLists?.entries ?? [])
        .map((s) => ({
          seat: conf.seats.find((del) => del.id === s.seatId),
          status: s.status
        }))
        .filter(
          (speaker): speaker is { seat: Seat; status: SpeakerEntryStatus } =>
            speaker.seat !== undefined
        )
        .map((speaker) => ({ ...speaker, seat: toSeatView(speaker.seat) }))
    })(),
    votingSession: votingData,
    activeMotion: displayMotion
      ? (() => {
          const proposedBy = findSeatView(displayMotion.proposedBySeatId)
          if (!proposedBy) return undefined
          return {
            type: displayMotion.type,
            topic:
              displayMotion.type === 'moderated_caucus'
                ? (displayMotion as any).topic
                : undefined,
            status: displayMotion.status,
            proposedBy,
            motionId: displayMotion.id,
            totalTimeSec:
              displayMotion.type === 'moderated_caucus'
                ? (displayMotion as any).totalTimeSec
                : displayMotion.type === 'unmoderated_caucus'
                  ? (displayMotion as any).durationSec
                  : displayMotion.type === 'individual_speech'
                    ? (displayMotion as any).durationSec
                    : undefined,
            speakingTimePerPersonSec:
              displayMotion.type === 'moderated_caucus'
                ? (displayMotion as any).speakingTimePerPersonSec
                : undefined,
            newTimeSec:
              displayMotion.type === 'modify_speaking_time'
                ? (displayMotion as any).newTimeSec
                : undefined,
            documentName:
              displayMotion.type === 'substantive_vote'
                ? (displayMotion as any).documentName
                : undefined
          }
        })()
      : undefined,
    activePoint: (() => {
      const latestPoint = conf.points?.length > 0 ? conf.points[conf.points.length - 1] : undefined
      if (!latestPoint) return undefined
      if (conf.dismissedPointIds?.includes(latestPoint.id)) return undefined
      if (Date.now() - latestPoint.proposedAt > 8000) return undefined
      const proposedBy = findSeatView(latestPoint.proposedBySeatId)
      if (!proposedBy) return undefined
      return {
        type: latestPoint.type,
        proposedBy,
        pointId: latestPoint.id
      }
    })(),
    caucusTimer: caucusData,
    caucusSetup: conf.caucusSetup
      ? (() => {
          const csMotion = conf.motions.find((m) => m.id === conf.caucusSetup!.motionId) as any
          const proposer = conf.seats.find((seat) => seat.id === csMotion?.proposedBySeatId)
          return {
            topic: csMotion?.topic,
            proposerName: proposer?.name,
            proposerPosition: conf.caucusSetup!.proposerPosition,
            speakerSeatIds: conf.caucusSetup!.speakerSeatIds,
            speakerNames: conf.caucusSetup!.speakerSeatIds
              .map(findSeatView)
              .filter((seat): seat is SeatView => seat !== undefined)
          }
        })()
      : undefined,
    recentMinutes: conf.minutes.slice(-10).map((m) => ({
      timestamp: m.timestamp,
      eventType: m.actionType,
      description: m.description
    })),
    yieldPending: conf.yieldPending
      ? (() => {
          const originalSeat = findSeatView(conf.yieldPending!.originalSeatId)
          if (!originalSeat) return undefined
          return {
            yieldType: conf.yieldPending.yieldType,
            originalSeat,
            remainingSec: Math.round(conf.yieldPending.remainingSec),
            questionerSeat: conf.yieldPending.questionerSeatId
              ? findSeatView(conf.yieldPending.questionerSeatId)
              : undefined
          }
        })()
      : undefined,
    rollCall: extra?.rollCall,
    attendanceChange: extra?.attendanceChange,
    motionDraft: extra?.motionDraft,
    pointDraft: extra?.pointDraft
  }
}
