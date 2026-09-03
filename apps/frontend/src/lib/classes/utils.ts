import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { goto } from '$app/navigation'
import { resolve } from '$app/paths'
import { getConferenceById, loadConference } from '$lib/classes/stores/conference/conference-store'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null }

/** 加载会议并导航到会议页面 */
export function navigateToConference(id: string, committeeId?: string): void {
  const conference = getConferenceById(id)
  const selectedCommitteeId = committeeId && conference?.committees.some((committee) => committee.id === committeeId)
    ? committeeId
    : conference?.committees[0]?.id
  loadConference(id, selectedCommitteeId)
  goto(resolve(selectedCommitteeId ? `/conference/${id}/committee/${selectedCommitteeId}` : `/conference/${id}`))
}
