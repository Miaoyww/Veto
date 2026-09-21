import { writable } from 'svelte/store'
import type { ConferenceDisplayExtra } from '$lib/classes/clients/conference-display-client'

export const chairDisplayExtra = writable<ConferenceDisplayExtra>({})

export function resetChairDisplayExtra(): void {
  chairDisplayExtra.set({})
}
