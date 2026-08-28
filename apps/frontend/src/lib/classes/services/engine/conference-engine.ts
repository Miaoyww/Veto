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
  MotionType,
  MajorityRule
} from '$lib/classes/types-conference'

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
  pending_speakers_list: '等待开启主发言名单',
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
  /** 拥有投票权的出席代表人数（排除观察员） */
  votingCount: number
  totalCount: number
  simpleMajorityThreshold: number
  twoThirdsThreshold: number
}

export function calculateMajorityThresholds(delegations: Delegation[]): MajorityThresholds {
  const presentCount = delegations.filter(
    (d) => d.attendance === 'present'
  ).length
  const votingCount = delegations.filter(
    (d) => d.attendance === 'present' && d.vetoPower !== false
  ).length
  return {
    presentCount,
    votingCount,
    totalCount: delegations.length,
    simpleMajorityThreshold: Math.floor(votingCount / 2) + 1,
    twoThirdsThreshold: Math.ceil(votingCount * 2 / 3)
  }
}

export function determinePassFail(
  ballots: VoteBallot[],
  majorityRule: MajorityRule,
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

/** 纯函数：统计投票（skip 不计入任何类别） */
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
    else if (b.vote === 'abstain') abstain++
    // skip 不计入
  }
  return { yes, no, abstain }
}

// ---- 动议裁决 ------------------------------------------------------------

export interface MotionResolution {
  requiresVoting: boolean
  votingMajority: MajorityRule
  autoApprove: boolean
}

/**
 * 判断动议是否需要表决，以及需要什么样的多数。
 * 遵循标准 MUN 议事规则。
 */
export function resolveMotion(motionType: MotionType): MotionResolution {
  switch (motionType) {
    // 无需表决，直接生效
    case 'change_attendance':
    case 'individual_speech':
      return { requiresVoting: false, votingMajority: 'simple_majority', autoApprove: false }

    // 需要简单多数表决
    case 'open_speakers_list':
    case 'moderated_caucus':
    case 'unmoderated_caucus':
    case 'modify_speaking_time':
    case 'resume_resolution':
    case 'reorder_resolution':
    case 'suspend_meeting':
    case 'substantive_vote':
      return { requiresVoting: true, votingMajority: 'simple_majority', autoApprove: false }

    // 需要 2/3 多数表决
    case 'closure_debate':
    case 'close_meeting':
    case 'postpone_resolution':
      return { requiresVoting: true, votingMajority: 'two_thirds', autoApprove: false }

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
 *
 * 使用 performance.now() 单调时钟计算实际经过时间，不依赖 setInterval 触发次数。
 * 当 Electron 应用进入后台、Chromium 节流 setInterval 时，计时器仍能正确追赶。
 */
export class Timer {
  readonly id: string
  readonly tickMs: number

  private _intervalId: ReturnType<typeof setInterval> | null = null
  private _totalSec = 0
  /** performance.now() 时间戳：计时起点（已扣除 initialElapsed 和暂停时间） */
  private _startTime = 0
  /** 暂停时快照的已过秒数（用于 resume 时恢复 _startTime） */
  private _savedElapsedSec = 0

  get isRunning(): boolean {
    return this._intervalId !== null
  }

  /** 当前已过秒数（运行时从 wall clock 计算，暂停时返回快照值） */
  get elapsedSec(): number {
    if (this._intervalId !== null) {
      return Math.min(this._totalSec, (performance.now() - this._startTime) / 1000)
    }
    return this._savedElapsedSec
  }

  get remainingSec(): number {
    return Math.max(0, this._totalSec - this.elapsedSec)
  }

  constructor(id: string, tickMs = 100) {
    this.id = id
    this.tickMs = tickMs
  }

  /** 每次 setInterval 触发时调用，基于 performance.now() 计算实际已过时间 */
  private _tick(onTick: (data: TimerTickData) => void, onExpire: () => void): void {
    const elapsed = (performance.now() - this._startTime) / 1000
    const clampedElapsed = Math.min(this._totalSec, elapsed)
    const remaining = Math.max(0, this._totalSec - clampedElapsed)

    onTick({
      remainingSec: remaining,
      elapsedSec: clampedElapsed,
      totalSec: this._totalSec
    })

    if (remaining <= 0) {
      this._savedElapsedSec = this._totalSec
      clearInterval(this._intervalId!)
      this._intervalId = null
      onExpire()
    }
  }

  /**
   * 启动倒计时（基于 performance.now() 单调时钟）。
   * @param totalSec 倒计时总时长（秒）
   * @param onTick 每次 tick 回调
   * @param onExpire 时间耗尽回调
   * @param initialElapsed 初始已过秒数（默认 0，用于从已有进度启动）
   */
  start(
    totalSec: number,
    onTick: (data: TimerTickData) => void,
    onExpire: () => void,
    initialElapsed = 0
  ): void {
    this.stop()
    this._totalSec = totalSec
    this._startTime = performance.now() - initialElapsed * 1000

    if (initialElapsed >= this._totalSec) {
      this._savedElapsedSec = this._totalSec
      onTick({
        remainingSec: 0,
        elapsedSec: this._totalSec,
        totalSec: this._totalSec
      })
      onExpire()
      return
    }

    this._intervalId = setInterval(() => this._tick(onTick, onExpire), this.tickMs)
  }

  /** 暂停计时，返回剩余秒数 */
  pause(): number {
    this._savedElapsedSec = this.elapsedSec
    if (this._intervalId !== null) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
    return this.remainingSec
  }

  /** 从暂停处恢复计时 */
  resume(onTick: (data: TimerTickData) => void, onExpire: () => void): void {
    if (this._intervalId !== null) return
    const remaining = this._totalSec - this._savedElapsedSec
    if (remaining <= 0) return

    this._startTime = performance.now() - this._savedElapsedSec * 1000
    this._intervalId = setInterval(() => this._tick(onTick, onExpire), this.tickMs)
  }

  /** 停止计时并清零 */
  stop(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
    this._savedElapsedSec = 0
    this._totalSec = 0
    this._startTime = 0
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
