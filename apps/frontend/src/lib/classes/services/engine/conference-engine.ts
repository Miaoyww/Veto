/**
 * conference-engine.ts
 * ──────────────────────────────────────────────
 * 模拟大会引擎：状态机、投票计算、计时器。
 * 与 simulation-engine.ts 不同，这是事件驱动而非 RAF 帧驱动。
 */

import {
  VALID_TRANSITIONS,
  PHASE_LABELS,
  canTransition,
  transitionPhase
} from '$lib/classes/utils/committee/phase'
import {
  calculateMajorityThresholds,
  determinePassFail,
  tallyVotesEngine
} from '$lib/classes/utils/committee/voting'
import { resolveMotion } from '$lib/classes/utils/committee/motions'
import { calcMaxSpeakers } from '$lib/classes/utils/committee/caucus'

export {
  VALID_TRANSITIONS,
  PHASE_LABELS,
  canTransition,
  transitionPhase,
  calculateMajorityThresholds,
  determinePassFail,
  tallyVotesEngine,
  resolveMotion,
  calcMaxSpeakers
}
export type { MotionResolution } from '$lib/classes/utils/committee/motions'
export type { MajorityThresholds } from '$lib/classes/types/committee'

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

