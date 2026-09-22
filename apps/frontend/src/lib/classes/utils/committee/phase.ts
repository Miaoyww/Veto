import type { ConferencePhase } from '$lib/classes/types/committee'

/** Allowed phase transitions for the Chair-owned committee procedure state. */
export const VALID_TRANSITIONS: Record<ConferencePhase, ConferencePhase[]> = {
  preamble: ['roll_call'],
  roll_call: ['pending_speakers_list', 'preamble'],
  pending_speakers_list: ['general_debate', 'suspended', 'closed'],
  general_debate: ['caucus', 'voting', 'suspended', 'closed'],
  caucus: ['general_debate', 'caucus', 'voting', 'suspended', 'closed'],
  voting: ['general_debate', 'caucus', 'voting', 'suspended', 'closed'],
  caucus_setup: ['caucus', 'general_debate', 'suspended', 'closed'],
  suspended: ['pending_speakers_list', 'general_debate', 'closed'],
  closed: ['pending_speakers_list']
}

/** Human-readable labels for Chair and Display procedure surfaces. */
export const PHASE_LABELS: Record<ConferencePhase, string> = {
  preamble: '会前准备',
  roll_call: '点名',
  pending_speakers_list: '等待开启主发言名单',
  general_debate: '一般性辩论',
  caucus: '磋商',
  voting: '投票表决',
  caucus_setup: '磋商准备',
  suspended: '休会',
  closed: '闭幕'
}

/** Return whether a phase transition is valid. Unknown phases are rejected. */
export function canTransition(from: ConferencePhase, to: ConferencePhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Validate a phase transition without mutating a Committee.
 * Invalid transitions return an Error value so callers can choose their own UI/error handling.
 */
export function transitionPhase(
  from: ConferencePhase,
  to: ConferencePhase
): ConferencePhase | Error {
  if (!canTransition(from, to)) {
    return new Error(`非法阶段转换: ${from} → ${to}`)
  }
  return to
}
