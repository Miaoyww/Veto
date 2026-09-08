import type { Directive, News, SituationUpdate } from '$lib/classes/types/delegate'

export interface HostConferenceContent {
  directives: Directive[]
  news: News[]
  situations: SituationUpdate[]
}

interface StoredHostConference extends HostConferenceContent {
  id: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Read content persisted by the local HostRuntime without exposing credentials or users. */
export async function loadHostConferenceContent(
  conferenceId: string
): Promise<HostConferenceContent | null> {
  if (typeof window === 'undefined' || !window.veto?.store) return null

  try {
    const raw = await window.veto.store.load('host-runtime')
    if (!isRecord(raw) || !Array.isArray(raw.conferences)) return null
    const conference = raw.conferences.find(
      (item): item is StoredHostConference => isRecord(item) && item.id === conferenceId
    )
    if (!conference) return null

    return {
      directives: Array.isArray(conference.directives) ? conference.directives : [],
      news: Array.isArray(conference.news) ? conference.news : [],
      situations: Array.isArray(conference.situations) ? conference.situations : []
    }
  } catch {
    return null
  }
}
