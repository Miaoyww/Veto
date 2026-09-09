// ============================================================
// timer.ts - Shared timer contracts
// ============================================================

/** Persistent timer state used by committee projections. */
export type TimerStatus = 'running' | 'paused'

/** Wire-level status used by Chair-to-Display timer ticks. */
export type TimerTickStatus = 'playing' | 'paused'

/** Display timer increment; the Display never owns timer state. */
export interface TimerTickData {
  remainingSec: number
  elapsedSec: number
  totalSec: number
  status: TimerTickStatus
}
