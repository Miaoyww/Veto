import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'

import type { CloudChairCommittee, CloudClaimResult } from '$lib/classes/clients/cloud-join-client'
import { Committee } from '$lib/classes/domain/committee.svelte'
import { Conference } from '$lib/classes/domain/conference.svelte'
import { conferences } from '$lib/classes/stores/conference/conference-store'

const getCloudChairCommittee = vi.hoisted(() => vi.fn())

vi.mock('$lib/classes/clients/cloud-join-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/classes/clients/cloud-join-client')>()

  return {
    ...actual,
    getCloudChairCommittee,
    getCloudSeatSession: () => null,
    saveCloudSeatSession: vi.fn()
  }
})

import { cloudSession } from './cloud-session-store.svelte'

const result: CloudClaimResult = {
  inviteCode: 'ABCD-EFGH-JKLM',
  conferenceId: 'conference-1',
  conferenceName: 'Conference',
  organizer: 'Organizer',
  committeeId: 'committee-1',
  committeeName: 'Committee',
  committeeType: 'cabinet',
  seatId: 'seat-1',
  seatName: 'Chair',
  seatShortName: 'Chair',
  roleTemplateId: 'role-1',
  roleName: 'Chair',
  capabilities: ['control_conference'],
  chair: null,
  seatState: 'claimed',
  hasPassword: false,
  wsUrl: 'wss://cloud.example.test',
  token: 'token',
  isChair: false,
  identity: {
    userId: 'user-1',
    displayName: 'Chair User',
    conferenceId: 'conference-1',
    committeeId: 'committee-1',
    seatId: 'seat-1',
    roleTemplateId: 'role-1',
    roleName: 'Chair',
    capabilities: ['control_conference'],
    isChair: false
  }
}

const projection: CloudChairCommittee = {
  conference: { id: 'conference-1', name: 'Conference', organizer: 'Organizer' },
  committee: { id: 'committee-1', name: 'Committee', type: 'cabinet' },
  chairSeat: {
    id: 'seat-1',
    name: 'Chair',
    roleTemplateId: 'role-1',
    roleName: 'Chair',
    capabilities: ['control_conference'],
    user: { id: 'user-1', displayName: 'Chair User' }
  },
  seats: []
}

describe('CloudSessionStore', () => {
  beforeEach(() => {
    cloudSession.clear()
    conferences.set([])
    getCloudChairCommittee.mockReset().mockResolvedValue(projection)
  })

  it('requests the authoritative chair projection when the session can control the conference', async () => {
    cloudSession.setResult(result)

    await cloudSession.ensureChairProjection('conference-1', 'committee-1')

    expect(getCloudChairCommittee).toHaveBeenCalledOnce()
    expect(getCloudChairCommittee).toHaveBeenCalledWith('token')
    expect(cloudSession.chairProjection).toEqual(projection)
  })

  it('hydrates roll-call participants from the authoritative chair projection', async () => {
    conferences.set([
      new Conference({
        id: 'conference-1',
        name: 'Conference',
        source: 'cloud',
        committees: [
          new Committee({
            id: 'committee-1',
            name: 'Committee',
            seats: [
              {
                id: 'seat-1',
                name: 'Chair',
                seatGroupId: 'committee-1:group',
                capabilityOverrides: {},
                procedure: { attendance: 'absent', hasVotingRights: true, sortOrder: 0 }
              }
            ]
          })
        ]
      })
    ])
    getCloudChairCommittee.mockResolvedValue({
      ...projection,
      seats: [
        {
          id: 'seat-1',
          name: 'Chair',
          roleTemplateId: 'role-1',
          roleName: 'Chair',
          hasVotingRights: true,
          user: { id: 'user-1', displayName: 'Chair User' }
        },
        {
          id: 'seat-2',
          name: 'France',
          shortName: 'FR',
          roleTemplateId: 'role-2',
          roleName: 'Delegate',
          hasVotingRights: true,
          user: { id: 'user-2', displayName: 'Delegate User' }
        }
      ]
    })
    cloudSession.setResult(result)

    await cloudSession.ensureChairProjection('conference-1', 'committee-1')

    const participants = get(conferences)
      .find((conference) => conference.id === 'conference-1')
      ?.getCommittee('committee-1')?.participantSeats
    expect(participants?.map((seat) => seat.id)).toEqual(['seat-2'])
  })
})
