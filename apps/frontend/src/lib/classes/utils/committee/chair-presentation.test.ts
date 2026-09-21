import { describe, expect, it } from 'vitest'
import type { Committee } from '$lib/classes/types/committee'
import { getChairPresentation } from './chair-presentation'

function committeeState(
  overrides: Partial<Pick<Committee, 'phase' | 'activeSpeaker' | 'activeCaucus'>> = {}
): Pick<Committee, 'phase' | 'activeSpeaker' | 'activeCaucus'> {
  return {
    phase: 'general_debate',
    activeSpeaker: null,
    activeCaucus: null,
    ...overrides
  }
}

describe('chair presentation', () => {
  it('maps general debate to its screen and enables chair actions', () => {
    const presentation = getChairPresentation(committeeState())

    expect(presentation.screen).toEqual({ kind: 'general_debate' })
    expect(presentation.canProposeMotion).toBe(true)
    expect(presentation.canProposePoint).toBe(true)
  })

  it('maps every caucus type explicitly', () => {
    const base = { motionId: 'motion-1', totalSec: 60, elapsedSec: 0, paused: false }

    expect(
      getChairPresentation(
        committeeState({ phase: 'caucus', activeCaucus: { ...base, type: 'moderated' } })
      ).screen
    ).toEqual({ kind: 'moderated_caucus' })
    expect(
      getChairPresentation(
        committeeState({ phase: 'caucus', activeCaucus: { ...base, type: 'unmoderated' } })
      ).screen
    ).toEqual({ kind: 'caucus_countdown', mode: 'unmoderated' })
    expect(
      getChairPresentation(
        committeeState({ phase: 'caucus', activeCaucus: { ...base, type: 'individual' } })
      ).screen
    ).toEqual({ kind: 'caucus_countdown', mode: 'individual' })
  })

  it('surfaces an invalid caucus state instead of treating it as a free caucus', () => {
    const presentation = getChairPresentation(
      committeeState({ phase: 'caucus', activeCaucus: null })
    )

    expect(presentation.screen.kind).toBe('invalid')
  })

  it('disables motions while a speaker or caucus is active', () => {
    const speaking = getChairPresentation(
      committeeState({
        activeSpeaker: { entryId: 'speaker-1', totalSec: 60, elapsedSec: 0, paused: false }
      })
    )
    const caucus = getChairPresentation(
      committeeState({
        phase: 'caucus',
        activeCaucus: {
          motionId: 'motion-1',
          type: 'unmoderated',
          totalSec: 60,
          elapsedSec: 0,
          paused: false
        }
      })
    )

    expect(speaking.canProposeMotion).toBe(false)
    expect(speaking.motionDisabledReason).toContain('发言计时')
    expect(caucus.canProposeMotion).toBe(false)
    expect(caucus.motionDisabledReason).toContain('磋商进行中')
  })
})
