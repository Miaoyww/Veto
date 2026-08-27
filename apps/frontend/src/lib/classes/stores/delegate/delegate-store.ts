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
  CabinetMode
} from '$lib/classes/types-delegate'
import { currentEngine } from '../conference/conference-store'
import { getDelegateBridge } from '$lib/services/delegate-bridge'

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

export const seatGroups = derived(currentEngine, ($engine) => $engine?.seatGroups ?? [])

export function addSeatGroup(name: string, type: SeatGroup['type'], defaultCapabilities: Capability[] = []): string {
  const engine = getEng()
  if (!engine) return ''
  const id = engine.addSeatGroup(name, type, defaultCapabilities)
  return id
}

export function updateSeatGroup(id: string, updates: Partial<SeatGroup>): void {
  const engine = getEng()
  if (!engine) return
  engine.updateSeatGroup(id, updates)
}

export function removeSeatGroup(id: string): void {
  const engine = getEng()
  if (!engine) return
  engine.removeSeatGroup(id)
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
  return id
}

export function updateSeat(id: string, updates: Partial<Seat>): void {
  const engine = getEng()
  if (!engine) return
  engine.updateSeat(id, updates)
}

export function setSeatPassword(seatId: string, passwordHash: string, salt: string): void {
  const engine = getEng()
  if (!engine) return
  engine.setSeatPassword(seatId, passwordHash, salt)
}

export function removeSeat(id: string): void {
  const engine = getEng()
  if (!engine) return
  engine.removeSeat(id)
}

export function resolveCapabilities(seatId: string): Capability[] {
  const engine = getEng()
  if (!engine) return []
  return engine.resolveCapabilities(seatId)
}

// ---- 模式切换 -------------------------------------------------------------

export function setCabinetMode(seatGroupId: string, mode: CabinetMode): void {
  const engine = getEng()
  if (!engine) return
  engine.setCabinetMode(seatGroupId, mode)
  // 通过 WS 广播模式切换
  getDelegateBridge().sendModeChange(seatGroupId, mode)
}

// ---- 指令 -----------------------------------------------------------------

/** 当前会议的所有指令 */
export const directives = derived(currentEngine, ($engine) => {
  // Directives are managed through the engine's news/situation pattern
  // For now, return empty; directives are stored in-memory via the engine
  return $engine?.news ?? []
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
  const engine = getEng()
  if (!engine) return ''
  return engine.createDirective(data)
}

// ---- 新闻 -----------------------------------------------------------------

/** 当前会议的所有新闻 */
export const newsList = derived(currentEngine, ($engine) => $engine?.news ?? [])

export function createNews(data: {
  title: string
  content: string
  source: string
  authorId: string
  seatGroupId: string
}): string {
  const engine = getEng()
  if (!engine) return ''
  const id = engine.createNews(data)
  return id
}

export function submitNews(newsId: string): void {
  const engine = getEng()
  if (!engine) return
  engine.submitNews(newsId)
}

export function publishNews(newsId: string, reviewerId: string): void {
  const engine = getEng()
  if (!engine) return
  engine.publishNews(newsId, reviewerId)
  // 通过 WS 通知 Delegate
  const newsItem = engine.news.find((n) => n.id === newsId)
  if (newsItem) {
    getDelegateBridge().sendNewsUpdated(newsItem)
  }
}

export function rejectNews(newsId: string, reviewerId: string, reviewComment: string): void {
  const engine = getEng()
  if (!engine) return
  engine.rejectNews(newsId, reviewerId, reviewComment)
  const newsItem = engine.news.find((n) => n.id === newsId)
  if (newsItem) {
    getDelegateBridge().sendNewsUpdated(newsItem)
  }
}

export function retractNews(newsId: string): void {
  const engine = getEng()
  if (!engine) return
  engine.retractNews(newsId)
  const newsItem = engine.news.find((n) => n.id === newsId)
  if (newsItem) {
    getDelegateBridge().sendNewsUpdated(newsItem)
  }
}

// ---- 局势更新 -------------------------------------------------------------

export const situationUpdates = derived(currentEngine, ($engine) => $engine?.situationUpdates ?? [])

export function createSituationUpdate(data: {
  title: string
  content: string
  publisherId: string
  authorId: string
  timelineId: string
  relatedBattleId?: string
  relatedLocation?: { lat: number; lng: number; label?: string }
}): string {
  const engine = getEng()
  if (!engine) return ''
  const id = engine.createSituationUpdate(data)
  // 通过 WS 通知 Delegate
  const update = engine.situationUpdates.find((s) => s.id === id)
  if (update) {
    getDelegateBridge().sendSituationCreated(update)
  }
  return id
}
