/**
 * conference-engine.ts
 * ──────────────────────────────────────────────
 * 模拟大会引擎：状态机、投票计算、计时器。
 * 与 simulation-engine.ts 不同，这是事件驱动而非 RAF 帧驱动。
 */

import type {
  Conference,
  ConferencePhase,
  Delegation,
  VoteBallot,
  Motion,
  MotionType
} from '$lib/types-conference'

// ---- 阶段状态机 ----------------------------------------------------------

export const VALID_TRANSITIONS: Record<ConferencePhase, ConferencePhase[]> = {
  preamble: ['roll_call'],
  roll_call: ['general_debate', 'preamble'],
  general_debate: ['caucus', 'voting', 'suspended', 'closed'],
  caucus: ['general_debate', 'caucus', 'voting', 'suspended', 'closed'],
  voting: ['general_debate', 'caucus', 'voting', 'suspended', 'closed'],
  suspended: ['general_debate', 'closed'],
  closed: []
}

export function canTransition(from: ConferencePhase, to: ConferencePhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function transitionPhase(
  _conf: Conference,
  from: ConferencePhase,
  to: ConferencePhase
): ConferencePhase | Error {
  if (!canTransition(from, to)) {
    return new Error(`非法阶段转换: ${from} → ${to}`)
  }
  return to
}

// ---- 阶段中文标签 ---------------------------------------------------------

export const PHASE_LABELS: Record<ConferencePhase, string> = {
  preamble: '会前准备',
  roll_call: '点名',
  general_debate: '一般性辩论',
  caucus: '磋商',
  voting: '投票表决',
  motion: '动议',
  caucus_setup: '磋商准备',
  suspended: '休会',
  closed: '闭幕'
}

// ---- 投票计算（纯函数）----------------------------------------------------

export interface MajorityThresholds {
  presentCount: number
  totalCount: number
  simpleMajorityThreshold: number
  twoThirdsThreshold: number
}

export function calculateMajorityThresholds(delegations: Delegation[]): MajorityThresholds {
  const presentCount = delegations.filter(
    (d) => d.attendance === 'present' || d.attendance === 'present_and_voting'
  ).length
  return {
    presentCount,
    totalCount: delegations.length,
    simpleMajorityThreshold: Math.floor(presentCount / 2) + 1,
    twoThirdsThreshold: Math.ceil(presentCount * 2 / 3)
  }
}

export function determinePassFail(
  ballots: VoteBallot[],
  majorityRule: 'simple_majority' | 'two_thirds',
  delegations: Delegation[]
): 'passed' | 'failed' {
  const { presentCount, simpleMajorityThreshold, twoThirdsThreshold } =
    calculateMajorityThresholds(delegations)

  let yesCount = 0
  for (const b of ballots) {
    if (b.vote === 'yes') yesCount++
  }

  const threshold =
    majorityRule === 'simple_majority' ? simpleMajorityThreshold : twoThirdsThreshold

  return yesCount >= threshold ? 'passed' : 'failed'
}

/** 检查是否有否决权国家投了反对票 */
export function checkVeto(ballots: VoteBallot[], delegations: Delegation[]): boolean {
  const vetoDelegationIds = new Set(
    delegations.filter((d) => d.vetoPower).map((d) => d.id)
  )
  return ballots.some(
    (b) => vetoDelegationIds.has(b.delegationId) && b.vote === 'no'
  )
}

/** 纯函数：统计投票 */
export function tallyVotesEngine(ballots: VoteBallot[]): {
  yes: number
  no: number
  abstain: number
} {
  let yes = 0
  let no = 0
  let abstain = 0
  for (const b of ballots) {
    if (b.vote === 'yes') yes++
    else if (b.vote === 'no') no++
    else abstain++
  }
  return { yes, no, abstain }
}

// ---- 动议裁决 ------------------------------------------------------------

export interface MotionResolution {
  requiresVoting: boolean
  votingMajority: 'simple_majority' | 'two_thirds'
  autoApprove: boolean
}

/**
 * 判断动议是否需要表决，以及需要什么样的多数。
 * 遵循标准 MUN 议事规则。
 */
export function resolveMotion(motionType: MotionType): MotionResolution {
  switch (motionType) {
    // 需要简单多数表决
    case 'moderated_caucus':
    case 'unmoderated_caucus':
    case 'modify_speaking_time':
    case 'resume_resolution':
    case 'reorder_resolution':
    case 'suspend_meeting':
      return { requiresVoting: true, votingMajority: 'simple_majority', autoApprove: false }

    // 需要 2/3 多数表决
    case 'closure_debate':
    case 'close_meeting':
    case 'postpone_resolution':
      return { requiresVoting: true, votingMajority: 'two_thirds', autoApprove: false }

    // 无需表决，自动通过
    case 'open_speakers_list':
      return { requiresVoting: false, votingMajority: 'simple_majority', autoApprove: true }

    default:
      return { requiresVoting: true, votingMajority: 'simple_majority', autoApprove: false }
  }
}

// ---- 计时器 --------------------------------------------------------------

export interface TimerTickData {
  remainingSec: number
  elapsedSec: number
  totalSec: number
}

/**
 * 可复用的倒计时器实例。
 * 替代旧的模块级单例函数（startSpeakerTimer / startCaucusTimer），
 * 每个上下文（主发言名单、磋商）持有自己的 Timer 实例，通过全局注册表按 ID 查找。
 */
export class Timer {
  readonly id: string
  readonly tickMs: number

  private _intervalId: ReturnType<typeof setInterval> | null = null
  private _remainingSec = 0

  get isRunning(): boolean {
    return this._intervalId !== null
  }

  get remainingSec(): number {
    return this._remainingSec
  }

  constructor(id: string, tickMs = 100) {
    this.id = id
    this.tickMs = tickMs
  }

  /**
   * 启动倒计时。先停止已有计时，再启动新的。
   * @param totalSec 倒计时总时长（秒）
   * @param onTick 每次 tick 回调
   * @param onExpire 时间耗尽回调
   */
  start(totalSec: number, onTick: (data: TimerTickData) => void, onExpire: () => void): void {
    this.stop()

    const startedAt = Date.now()
    const initialTotal = totalSec
    this._remainingSec = totalSec

    this._intervalId = setInterval(() => {
      const elapsedSec = (Date.now() - startedAt) / 1000
      this._remainingSec = Math.max(0, initialTotal - elapsedSec)

      onTick({
        remainingSec: this._remainingSec,
        elapsedSec: Math.min(initialTotal, elapsedSec),
        totalSec: initialTotal
      })

      if (this._remainingSec <= 0) {
        this.stop()
        onExpire()
      }
    }, this.tickMs)
  }

  /** 暂停计时，返回剩余秒数（不清零，供 resume 使用） */
  pause(): number {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
    return this._remainingSec
  }

  /** 从暂停处恢复计时 */
  resume(onTick: (data: TimerTickData) => void, onExpire: () => void): void {
    if (this._remainingSec <= 0) return
    this.start(this._remainingSec, onTick, onExpire)
  }

  /** 停止计时并清零剩余时间 */
  stop(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
    this._remainingSec = 0
  }
}

// ---- 全局计时器注册表 -------------------------------------------------------

const _timers = new Map<string, Timer>()

/** 创建或获取计时器实例（幂等：同一 ID 不会重复创建） */
export function createTimer(id: string, tickMs?: number): Timer {
  const existing = _timers.get(id)
  if (existing) return existing
  const timer = new Timer(id, tickMs)
  _timers.set(id, timer)
  return timer
}

/** 按 ID 查找计时器 */
export function getTimer(id: string): Timer | undefined {
  return _timers.get(id)
}

/** 销毁计时器：停止并从注册表移除 */
export function destroyTimer(id: string): void {
  const timer = _timers.get(id)
  if (timer) {
    timer.stop()
    _timers.delete(id)
  }
}

/** 销毁所有计时器（路由离开时调用） */
export function destroyAllTimers(): void {
  for (const timer of _timers.values()) {
    timer.stop()
  }
  _timers.clear()
}

// ---- 有主持磋商：计算最大发言人数 ------------------------------------------

export function calcMaxSpeakers(totalTimeSec: number, speakingTimePerPersonSec: number): number {
  if (speakingTimePerPersonSec <= 0) return 0
  return Math.floor(totalTimeSec / speakingTimePerPersonSec)
}
