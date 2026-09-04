/**
 * 大会创建适配层，持久化实体只有 Conference。
 */
import { get } from 'svelte/store'
import type { Committee, Conference } from '$lib/classes/types/conference'
import type { RoleTemplate } from '$lib/classes/types/event'
import type { Capability, Seat, SeatAccess, SeatGroup, SeatGroupType } from '$lib/classes/types/delegate'
import { conferences, createConference, saveConferencesNow, getConferenceById } from './conference-store'
import { generateInviteCode } from '$lib/classes/services/seat-access'

export interface CommitteeDraft {
  id: string
  name: string
  type: SeatGroupType
  seats: Array<{ name: string; roleId: string }>
}

export interface CreateConferenceInput {
  name: string
  description?: string
  organizer?: string
  roleTemplates: RoleTemplate[]
  committees: CommitteeDraft[]
}

function createId(): string {
  return crypto.randomUUID()
}

function capabilityOverrides(capabilities: Capability[]): Seat['capabilityOverrides'] {
  return Object.fromEntries(capabilities.map((capability) => [capability, true]))
}

function createCommittee(id: string, name: string, seats: Seat[]): Committee {
  return {
    id,
    name,
    phase: 'preamble',
    agenda: [],
    seats,
    speakerLists: { id: 'main', name: '主发言名单', entries: [] },
    motions: [],
    dismissedResolvedMotionIds: [],
    points: [],
    dismissedPointIds: [],
    draftResolutions: [],
    documentNames: [],
    votingSessions: [],
    minutes: [],
    defaultSpeakingTimeSec: 120,
    activeCaucus: null,
    activeSpeaker: null
  }
}

export function getCreatedConferenceById(id: string): Conference | null {
  return get(conferences).find((conference) => conference.id === id) ?? null
}

/** Creates one Conference with all of the requested Committee records. */
export async function createConferenceFromDraft(input: CreateConferenceInput): Promise<string | null> {
  const name = input.name.trim()
  if (!name || input.committees.length === 0) return null

  const roleTemplates = input.roleTemplates.map((role) => ({ ...role, name: role.name.trim() }))
  const roles = new Map(roleTemplates.map((role) => [role.id, role]))
  const existingKeys = new Set(get(conferences).flatMap((conference) => conference.seatAccesses.map((access) => access.inviteCode)))
  const seatGroups: SeatGroup[] = []
  const seatAccesses: SeatAccess[] = []
  const committees: Committee[] = []

  for (const [index, draft] of input.committees.entries()) {
    const groupId = createId()
    seatGroups.push({
      id: groupId,
      name: draft.name.trim(),
      type: draft.type,
      defaultCapabilities: [],
      sortOrder: index
    })
    const seats = draft.seats.map((draftSeat, sortOrder) => {
      const role = roles.get(draftSeat.roleId)
      const seat: Seat = {
        id: createId(),
        name: draftSeat.name.trim(),
        seatGroupId: groupId,
        capabilityOverrides: capabilityOverrides(role?.capabilities ?? []),
        role: role?.name,
        roleId: draftSeat.roleId,
        procedure:
          draft.type === 'cabinet'
            ? { attendance: 'absent', hasVotingRights: true, sortOrder }
            : undefined
      }
      seatAccesses.push({ seatId: seat.id, inviteCode: generateInviteCode(existingKeys) })
      return seat
    })
    committees.push(createCommittee(draft.id, draft.name.trim(), seats))
  }

  const conferenceId = createConference(name, committees[0].name, [], [], {
    id: createId(),
    seatGroups,
    seatAccesses,
    committees
  })
  const conference = getConferenceById(conferenceId)
  if (!conference) return null
  conference.rename(name)
  conference.description = input.description?.trim() || undefined
  conference.organizer = input.organizer?.trim() || undefined
  conference.updateSeatGroups(() => seatGroups)
  conference.setRoleTemplates(roleTemplates)
  conferences.update((items) => [...items])
  await saveConferencesNow()
  return conferenceId
}
