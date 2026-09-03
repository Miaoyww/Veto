/**
 * delegate-store.ts — 代表端状态管理
 *
 * 薄包装层，遵循 conference-store.ts 的引擎代理模式。
 * - 读写 delegate 相关数据（指令、新闻、局势更新）
 * - 席位、席位组管理
 * - 模式切换
 * - 通过 delegate-bridge 同步到代表端
 */

import { derived, get } from 'svelte/store'
import type {
  SeatGroup,
  Seat,
  Capability,
  CabinetMode,
  News
} from '$lib/classes/types/delegate'
import {
  conferences,
  currentConferenceRecord,
  currentEngine,
  removeSeatsForSeatGroup,
  syncCurrentCommittee
} from '../conference/conference-store'
import { getDelegateBridge } from '$lib/classes/clients/delegate-client'

// ---- 辅助：获取当前引擎 -------------------------------------------------

function getEng() {
  const engine = get(currentEngine)
  if (!engine) {
    console.warn('[delegate-store] No current engine')
    return null
  }
  return engine
}

// ---- 席位组 ---------------------------------------------------------------

export const seatGroups = derived(currentConferenceRecord, ($conference) => $conference?.seatGroups ?? [])

export function addSeatGroup(name: string, type: SeatGroup['type'], defaultCapabilities: Capability[] = []): string {
  const conference = get(currentConferenceRecord)
  if (!conference) return ''
  const id = crypto.randomUUID()
  conferences.update((items) => items.map((item) => item.id === conference.id ? {
    ...item,
    updatedAt: Date.now(),
    seatGroups: [...item.seatGroups, {
      id,
      name,
      type,
      defaultCapabilities,
      mode: type === 'cabinet' ? 'standing' : undefined,
      sortOrder: item.seatGroups.length
    }]
  } : item))
  return id
}

function updateCurrentConference(
  updater: (conference: NonNullable<ReturnType<typeof getCurrentConference>>) => NonNullable<ReturnType<typeof getCurrentConference>>
): void {
  const conference = getCurrentConference()
  if (!conference) return
  conferences.update((items) =>
    items.map((item) =>
      item.id === conference.id ? { ...updater(item), updatedAt: Date.now() } : item
    )
  )
}

function getCurrentConference() {
  return get(currentConferenceRecord)
}

export function updateSeatGroup(id: string, updates: Partial<SeatGroup>): void {
  const conference = get(currentConferenceRecord)
  if (!conference) return
  conferences.update((items) => items.map((item) => item.id === conference.id ? {
    ...item,
    updatedAt: Date.now(),
    seatGroups: item.seatGroups.map((group) => group.id === id ? { ...group, ...updates } : group)
  } : item))
}

export function removeSeatGroup(id: string): void {
  const conference = get(currentConferenceRecord)
  if (!conference) return
  conferences.update((items) => items.map((item) => item.id === conference.id ? {
    ...item,
    updatedAt: Date.now(),
    seatGroups: item.seatGroups.filter((group) => group.id !== id)
  } : item))
  removeSeatsForSeatGroup(id)
}

// ---- 席位 -----------------------------------------------------------------

export const seats = derived(currentEngine, ($engine) => $engine?.seats ?? [])

export function addSeat(
  name: string,
  seatGroupId: string,
  role?: string,
  capabilityOverrides: Partial<Record<Capability, boolean>> = {}
): string {
  const engine = getEng()
  if (!engine) return ''
  const id = engine.addSeat(name, seatGroupId, role, capabilityOverrides)
  syncCurrentCommittee()
  return id
}

export function updateSeat(id: string, updates: Partial<Seat>): void {
  const engine = getEng()
  if (!engine) return
  engine.updateSeat(id, updates)
  syncCurrentCommittee()
}

export function setSeatPassword(seatId: string, passwordHash: string, salt: string): void {
  const engine = getEng()
  if (!engine) return
  engine.setSeatPassword(seatId, passwordHash, salt)
  syncCurrentCommittee()
}

export function removeSeat(id: string): void {
  const engine = getEng()
  if (!engine) return
  engine.removeSeat(id)
  syncCurrentCommittee()
}

export function resolveCapabilities(seatId: string): Capability[] {
  const engine = getEng()
  const conference = get(currentConferenceRecord)
  if (!engine || !conference) return []
  const seat = engine.seats.find((item) => item.id === seatId)
  const group = conference.seatGroups.find((item) => item.id === seat?.seatGroupId)
  if (!seat || !group) return []
  return group.defaultCapabilities.filter((capability) => seat.capabilityOverrides[capability] !== false)
    .concat(Object.entries(seat.capabilityOverrides)
      .filter(([, enabled]) => enabled)
      .map(([capability]) => capability as Capability)
      .filter((capability) => !group.defaultCapabilities.includes(capability)))
}

// ---- 模式切换 -------------------------------------------------------------

export function setCabinetMode(seatGroupId: string, mode: CabinetMode): void {
  updateSeatGroup(seatGroupId, { mode })
  // 通过 WS 广播模式切换
  getDelegateBridge().sendModeChange(seatGroupId, mode)
}

// ---- 指令 -----------------------------------------------------------------

/** 当前会议的所有指令 */
export const directives = derived(currentEngine, ($engine) => {
  void $engine
  return []
})

export function createDirective(data: {
  title: string
  initiatorId: string
  initiatorRole?: string
  target: string
  classification: 'confidential' | 'secret' | 'top_secret' | 'public'
  content: string
  cabinetId: string
}): string {
  void data
  return ''
}

// ---- 新闻 -----------------------------------------------------------------

/** 当前会议的所有新闻 */
export const newsList = derived(currentConferenceRecord, ($conference) => $conference?.news ?? [])

export function createNews(data: {
  title: string
  content: string
  source: string
  authorId: string
  seatGroupId: string
}): string {
  const id = crypto.randomUUID()
  updateCurrentConference((conference) => ({
    ...conference,
    news: [...conference.news, { ...data, id, status: 'draft', createdAt: Date.now() }]
  }))
  return id
}

export function submitNews(newsId: string): void {
  updateCurrentConference((conference) => ({
    ...conference,
    news: conference.news.map((news) =>
      news.id === newsId ? { ...news, status: 'submitted' } : news
    )
  }))
}

export function publishNews(newsId: string, reviewerId: string): void {
  let updated: News | undefined
  updateCurrentConference((conference) => ({
    ...conference,
    news: conference.news.map((news) => {
      if (news.id !== newsId) return news
      updated = { ...news, status: 'published', reviewerId, publishedAt: Date.now() }
      return updated
    })
  }))
  // 通过 WS 通知 Delegate
  if (updated) {
    getDelegateBridge().sendNewsUpdated(updated)
  }
}

export function rejectNews(newsId: string, reviewerId: string, reviewComment: string): void {
  let updated: News | undefined
  updateCurrentConference((conference) => ({
    ...conference,
    news: conference.news.map((news) => {
      if (news.id !== newsId) return news
      updated = { ...news, status: 'rejected', reviewerId, reviewComment }
      return updated
    })
  }))
  if (updated) {
    getDelegateBridge().sendNewsUpdated(updated)
  }
}

export function retractNews(newsId: string): void {
  let updated: News | undefined
  updateCurrentConference((conference) => ({
    ...conference,
    news: conference.news.map((news) => {
      if (news.id !== newsId) return news
      updated = { ...news, status: 'retracted', retractedAt: Date.now() }
      return updated
    })
  }))
  if (updated) {
    getDelegateBridge().sendNewsUpdated(updated)
  }
}

// ---- 局势更新 -------------------------------------------------------------

export const situationUpdates = derived(
  currentConferenceRecord,
  ($conference) => $conference?.situationUpdates ?? []
)

export function createSituationUpdate(data: {
  title: string
  content: string
  publisherId: string
  authorId: string
  timelineId: string
  relatedBattleId?: string
  relatedLocation?: { lat: number; lng: number; label?: string }
}): string {
  const id = crypto.randomUUID()
  const update = { ...data, id, createdAt: Date.now() }
  updateCurrentConference((conference) => ({
    ...conference,
    situationUpdates: [...conference.situationUpdates, update]
  }))
  // 通过 WS 通知 Delegate
  getDelegateBridge().sendSituationCreated(update)
  return id
}
