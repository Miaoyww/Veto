import { describe, expect, it } from 'vitest'
import { calculateMajorityThresholds, determinePassFail, tallyVotes } from './voting'
import type { ParticipantSeat } from '$lib/classes/types/delegate'

const seat = (id: string, attendance: 'present' | 'absent', hasVotingRights = true): ParticipantSeat => ({
  id,
  name: id,
  seatGroupId: 'g1',
  capabilityOverrides: {},
  procedure: { attendance, hasVotingRights, sortOrder: 0 }
})

describe('committee voting utilities', () => {
  it('calculates thresholds from present voting seats', () => {
    expect(calculateMajorityThresholds([seat('a', 'present'), seat('b', 'present'), seat('c', 'absent')])).toEqual({
      presentCount: 2,
      votingCount: 2,
      totalCount: 3,
      simpleMajorityThreshold: 2,
      twoThirdsThreshold: 2
    })
  })

  it('does not count skipped ballots', () => {
    expect(tallyVotes([{ seatId: 'a', vote: 'yes' }, { seatId: 'b', vote: 'skip' }])).toEqual({
      yes: 1,
      no: 0,
      abstain: 0
    })
  })

  it('determines pass/fail against the selected rule', () => {
    const seats = [seat('a', 'present'), seat('b', 'present')]
    expect(determinePassFail([{ seatId: 'a', vote: 'yes' }, { seatId: 'b', vote: 'no' }], 'simple_majority', seats)).toBe('failed')
    expect(determinePassFail([{ seatId: 'a', vote: 'yes' }, { seatId: 'b', vote: 'yes' }], 'simple_majority', seats)).toBe('passed')
  })
})
