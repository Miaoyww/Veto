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

export type { TimerTickData } from '$lib/classes/types/timer'
export { Timer, createTimer, getTimer, destroyTimer, destroyAllTimers } from '$lib/classes/services/timer/timer'

