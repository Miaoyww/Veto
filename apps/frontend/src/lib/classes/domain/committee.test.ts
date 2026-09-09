import { describe, expect, it } from 'vitest'
import { Committee } from './committee.svelte'

describe('Committee domain aggregate', () => {
  it('round-trips a committee through JSON', () => {
    const source = new Committee({
      id: 'c1',
      name: 'GA',
      seats: [],
      agenda: [],
      motions: [],
      points: [],
      draftResolutions: [],
      documentNames: [],
      votingSessions: [],
      minutes: [],
      dismissedResolvedMotionIds: [],
      dismissedPointIds: [],
      defaultSpeakingTimeSec: 120,
      phase: 'preamble'
    })

    expect(Committee.fromJSON(source.toJSON()).toJSON()).toEqual(source.toJSON())
  })

  it('returns copy-on-read participant seats', () => {
    const committee = new Committee()
    const seats = committee.participantSeats
    const originalLength = seats.length

    seats.pop()

    expect(committee.participantSeats).toHaveLength(originalLength)
  })

  it('returns copy-on-read speaker collections', () => {
    const committee = new Committee()
    const seatId = committee.addSeat('Delegate', 'group-1')
    const seat = committee.getSeat(seatId)
    expect(seat).toBeDefined()
    committee.speakerList.add(seat!)

    const waiting = committee.waitingSpeakers
    waiting.pop()
    const serialized = committee.speakerLists
    serialized.entries.pop()

    expect(committee.waitingSpeakers).toHaveLength(1)
    expect(committee.speakerLists.entries).toHaveLength(1)
  })
})
