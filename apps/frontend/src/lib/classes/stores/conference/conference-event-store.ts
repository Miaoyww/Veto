import { get, writable } from 'svelte/store'
import type { ConferenceEvent, RoleTemplate } from '$lib/classes/types/event'
import type { Capability, Seat, SeatGroup, SeatGroupType } from '$lib/classes/types/delegate'
import { bootstrapStore, saveToStore } from '../../helpers/store-bridge'
import { createConference, saveConferencesNow } from './conference-store'

const STORAGE_KEY = 'veto_conference_events'
const STORE_DOMAIN = 'events'

export interface ConferenceEventConferenceDraft {
  /** 小会议 id（创建向导中生成，持久化时沿用，作为小会议的唯一标识） */
  id: string
  name: string
  venue?: string
  type: SeatGroupType
  seats: Array<{
    name: string
    roleId: string
  }>
}

export interface CreateConferenceEventInput {
  name: string
  description?: string
  organizer?: string
  roleTemplates: RoleTemplate[]
  conferences: ConferenceEventConferenceDraft[]
}

function loadEventsFromStorage(): ConferenceEvent[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ConferenceEvent[]) : []
  } catch {
    return []
  }
}

function saveEvents(events: ConferenceEvent[]): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  }
  void saveToStore(STORE_DOMAIN, events)
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
  while (existing.has(key)) {
    key = `${randomKeyCharacters(4)}-${randomKeyCharacters(4)}-${randomKeyCharacters(4)}`
  }
  existing.add(key)
  return key
}

function capabilityOverrides(capabilities: Capability[]): Seat['capabilityOverrides'] {
  return Object.fromEntries(capabilities.map((capability) => [capability, true]))
}

export const conferenceEvents = writable<ConferenceEvent[]>(loadEventsFromStorage())

export const conferenceEventsReady: Promise<void> = bootstrapStore<ConferenceEvent[]>(
  STORE_DOMAIN,
  []
).then((data) => {
  conferenceEvents.set(data)
})

conferenceEvents.subscribe(saveEvents)

export function getConferenceEventById(id: string): ConferenceEvent | null {
  return get(conferenceEvents).find((event) => event.id === id) ?? null
}

export async function createConferenceEvent(
  input: CreateConferenceEventInput
): Promise<string | null> {
  const eventName = input.name.trim()
  if (!eventName || input.conferences.length === 0) return null

  const roleTemplates = input.roleTemplates.map((role) => ({
    ...role,
    name: role.name.trim()
  }))
  const roleById = new Map(roleTemplates.map((role) => [role.id, role]))
  const existingKeys = new Set<string>()
  const conferenceIds: string[] = []
  const eventId = createId()

  for (const draft of input.conferences) {
    const seatGroupId = createId()
    const seatGroup: SeatGroup = {
      id: seatGroupId,
      name: draft.name.trim(),
      type: draft.type,
      defaultCapabilities: [],
      mode: draft.type === 'cabinet' ? 'standing' : undefined,
      sortOrder: 0
    }

    const seats: Seat[] = draft.seats.map((seatDraft) => {
      const role = roleById.get(seatDraft.roleId)
      return {
        id: createId(),
        name: seatDraft.name.trim(),
        seatGroupId,
        capabilityOverrides: capabilityOverrides(role?.capabilities ?? []),
        inviteCode: createSeatKey(existingKeys),
        passwordHash: '',
        role: role?.name,
        roleId: seatDraft.roleId
      }
    })

    const conferenceId = createConference(
      draft.name.trim(),
      draft.venue?.trim() || draft.name.trim(),
      [],
      [],
      {
        id: draft.id,
        eventId,
        seatGroups: [seatGroup],
        seats
      }
    )
    if (!conferenceId) continue
    conferenceIds.push(conferenceId)
  }

  if (conferenceIds.length === 0) return null

  const now = Date.now()
  const event: ConferenceEvent = {
    id: eventId,
    name: eventName,
    description: input.description?.trim() || undefined,
    organizer: input.organizer?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    conferenceIds,
    roleTemplates,
    news: [],
    situationUpdates: []
  }

  conferenceEvents.update((events) => [...events, event])
  await saveConferencesNow()
  return event.id
}
