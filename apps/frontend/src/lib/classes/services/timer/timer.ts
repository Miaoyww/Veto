import type { TimerTickData } from '$lib/classes/types/timer'

/** A reusable monotonic-clock countdown timer independent of Committee state. */
export class Timer {
  readonly id: string
  readonly tickMs: number

  private _intervalId: ReturnType<typeof setInterval> | null = null
  private _totalSec = 0
  private _startTime = 0
  private _savedElapsedSec = 0

  get isRunning(): boolean {
    return this._intervalId !== null
  }

  /** Elapsed seconds, calculated from wall-clock time while running. */
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

  private _tick(onTick: (data: TimerTickData) => void, onExpire: () => void): void {
    const elapsed = (performance.now() - this._startTime) / 1000
    const clampedElapsed = Math.min(this._totalSec, elapsed)
    const remaining = Math.max(0, this._totalSec - clampedElapsed)

    onTick({
      remainingSec: remaining,
      elapsedSec: clampedElapsed,
      totalSec: this._totalSec,
      status: 'playing'
    })

    if (remaining <= 0) {
      this._savedElapsedSec = this._totalSec
      clearInterval(this._intervalId!)
      this._intervalId = null
      onExpire()
    }
  }

  /** Start a countdown, optionally restoring an already elapsed duration. */
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
        totalSec: this._totalSec,
        status: 'playing'
      })
      onExpire()
      return
    }

    this._intervalId = setInterval(() => this._tick(onTick, onExpire), this.tickMs)
  }

  /** Pause the countdown and return the remaining duration in seconds. */
  pause(): number {
    this._savedElapsedSec = this.elapsedSec
    if (this._intervalId !== null) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
    return this.remainingSec
  }

  /** Resume a paused countdown with callbacks for ticks and expiration. */
  resume(onTick: (data: TimerTickData) => void, onExpire: () => void): void {
    if (this._intervalId !== null) return
    const remaining = this._totalSec - this._savedElapsedSec
    if (remaining <= 0) return

    this._startTime = performance.now() - this._savedElapsedSec * 1000
    this._intervalId = setInterval(() => this._tick(onTick, onExpire), this.tickMs)
  }

  /** Stop the countdown and clear its elapsed state. */
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

const _timers = new Map<string, Timer>()

/** Create or return the registry timer for an ID. */
export function createTimer(id: string, tickMs?: number): Timer {
  const existing = _timers.get(id)
  if (existing) return existing
  const timer = new Timer(id, tickMs)
  _timers.set(id, timer)
  return timer
}

/** Look up a registry timer by ID. */
export function getTimer(id: string): Timer | undefined {
  return _timers.get(id)
}

/** Stop and remove one registry timer. */
export function destroyTimer(id: string): void {
  const timer = _timers.get(id)
  if (timer) {
    timer.stop()
    _timers.delete(id)
  }
}

/** Stop and remove every registry timer. */
export function destroyAllTimers(): void {
  for (const timer of _timers.values()) timer.stop()
  _timers.clear()
}
