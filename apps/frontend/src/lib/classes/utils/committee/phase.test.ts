import { describe, expect, it } from 'vitest'
import { canTransition, PHASE_LABELS, transitionPhase } from './phase'

describe('committee phase utilities', () => {
  it('accepts configured transitions and rejects invalid transitions', () => {
    expect(canTransition('preamble', 'roll_call')).toBe(true)
    expect(canTransition('closed', 'voting')).toBe(false)
    const result = transitionPhase('closed', 'voting')
    expect(result).toBeInstanceOf(Error)
  })

  it('returns the target phase for a valid transition', () => {
    expect(transitionPhase('preamble', 'roll_call')).toBe('roll_call')
    expect(PHASE_LABELS.voting).toBe('投票表决')
  })
})
