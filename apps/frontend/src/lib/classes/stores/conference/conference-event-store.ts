/**
 * 大会创建适配层。
 *
 * 大会创建适配层。文件名为兼容已有导入保留，持久化实体只有 Conference。
 */
import { get } from 'svelte/store'
import type { Committee, Conference } from '$lib/classes/types/conference'
import type { RoleTemplate } from '$lib/classes/types/event'
import type { Capability, Seat, SeatGroup, SeatGroupType } from '$lib/classes/types/delegate'
import { conferences, createConference, saveConferencesNow, getConferenceById } from './conference-store'

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

function randomKeyCharacters(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

function createSeatKey(existing: Set<string>): string {
  let key = `${randomKeyCharacters(4)}-${randomKeyCharacters(4)}-${randomKeyCharacters(4)}`
  while (existing.has(key)) key = `${randomKeyCharacters(4)}-${randomKeyCharacters(4)}-${randomKeyCharacters(4)}`
  existing.add(key)
  return key
}

function capabilityOverrides(capabilities: Capability[]): Seat['capabilityOverrides'] {
  return Object.fromEntries(capabilities.map((capability) => [capability, true]))
}

function createCommittee(id: string, name: string, seats: Seat[]): Committee {
  return {
    id,
    name,
    phase: 'preamble',
    delegations: seats.map((seat, sortOrder) => ({
      ...seat,
      attendance: 'absent',
      vetoPower: true,
      sortOrder
    })),
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
  const existingKeys = new Set<string>()
  const seatGroups: SeatGroup[] = []
  const committees: Committee[] = []

  for (const [index, draft] of input.committees.entries()) {
    const groupId = createId()
    seatGroups.push({
      id: groupId,
      name: draft.name.trim(),
      type: draft.type,
      defaultCapabilities: [],
      mode: draft.type === 'cabinet' ? 'standing' : undefined,
      sortOrder: index
    })
    const seats = draft.seats.map((draftSeat) => {
      const role = roles.get(draftSeat.roleId)
      return {
        id: createId(),
        name: draftSeat.name.trim(),
        seatGroupId: groupId,
        capabilityOverrides: capabilityOverrides(role?.capabilities ?? []),
        inviteCode: createSeatKey(existingKeys),
        passwordHash: '',
        role: role?.name,
        roleId: draftSeat.roleId
      }
    })
    committees.push(createCommittee(draft.id, draft.name.trim(), seats))
  }

  const conferenceId = createConference(name, committees[0].name, [], [], {
    id: createId(),
    seatGroups,
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
