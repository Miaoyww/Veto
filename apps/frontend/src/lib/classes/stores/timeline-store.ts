/**
 * timeline-store.ts
 * ──────────────────────────────────────────────
 * 时间线模拟器状态管理。
 *
 * - 管理多个 Timeline 实例（列表、CRUD、持久化）
 * - 引擎实例按需创建，通过 Map 缓存
 * - 持久化通过 store-bridge（localStorage + 文件）
 */

import { writable, get } from 'svelte/store'
import { bootstrapStore, saveToStore } from './store-bridge'
import { TimelineEngine, type TimelineState } from '$lib/classes/engine/timeline-engine.svelte'
import { emitServiceEvent } from '$lib/services/event-bus-bridge'

// ─── 类型 ──────────────────────────────────────────────────────────────

export interface Timeline {
  id: string
  name: string
  createdAt: number
  state: TimelineState
}

// ─── 常量 ──────────────────────────────────────────────────────────────

const STORE_DOMAIN = 'tools'
const STORAGE_KEY = 'veto_timeline'

// ─── 引擎缓存 ──────────────────────────────────────────────────────────

const _engines = new Map<string, TimelineEngine>()

/** 获取或创建指定 ID 的时间线引擎 */
export function getTimelineEngine(id: string): TimelineEngine | undefined {
  // 先查缓存
  let engine = _engines.get(id)
  if (engine) return engine

  // 从 store 中加载状态
  const timeline = get(timelines).find((t) => t.id === id)
  if (!timeline) return undefined

  engine = new TimelineEngine(id, timeline.state)
  engine._onStateChange = (state) => updateTimelineState(id, state)
  _engines.set(id, engine)
  return engine
}

/** 销毁引擎（页面离开时调用） */
export function disposeTimelineEngine(id: string): void {
  const engine = _engines.get(id)
  if (engine) {
    engine._stopRaf()
    engine._onStateChange = undefined
    _engines.delete(id)
  }
}

// ─── 持久化 ────────────────────────────────────────────────────────────

function loadTimelinesFromStorage(): Timeline[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Timeline[]
  } catch {
    return []
  }
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave(): void {
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    const json = JSON.stringify(get(timelines))
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, json)
    }
    void saveToStore(STORE_DOMAIN, JSON.parse(json))
  }, 2000)
}

// ─── Store ─────────────────────────────────────────────────────────────

/** 所有时间线列表 */
export const timelines = writable<Timeline[]>(loadTimelinesFromStorage())
timelines.subscribe(() => scheduleSave())

/** 启动完成 Promise */
export const timelinesReady: Promise<void> = bootstrapStore<Timeline[]>(STORE_DOMAIN, []).then(
  (data) => {
    timelines.set(data)
  }
)

/** 当前激活的时间线 ID */
export const currentTimelineId = writable<string | null>(null)

// ─── CRUD ──────────────────────────────────────────────────────────────

/** 创建新时间线 */
export function createTimeline(name: string, initialSimTime: number, ratio: number): string {
  const now = Date.now()
  const state: TimelineState = {
    realAnchor: now,
    simulationAnchor: initialSimTime,
    ratio,
    paused: true,
    pausedSimulationTime: initialSimTime
  }

  const timeline: Timeline = {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    state
  }

  timelines.update((list) => [...list, timeline])
  emitServiceEvent('timeline:created', { timelineId: timeline.id, name, ratio })
  return timeline.id
}

/** 删除时间线 */
export function deleteTimeline(id: string): void {
  const timeline = get(timelines).find((t) => t.id === id)
  disposeTimelineEngine(id)
  timelines.update((list) => list.filter((t) => t.id !== id))
  if (get(currentTimelineId) === id) {
    currentTimelineId.set(null)
  }
  if (timeline) {
    emitServiceEvent('timeline:deleted', { timelineId: id, name: timeline.name })
  }
}

/** 重命名时间线 */
export function renameTimeline(id: string, name: string): void {
  timelines.update((list) => list.map((t) => (t.id === id ? { ...t, name } : t)))
}

/** 更新时间线状态（由引擎调用） */
export function updateTimelineState(id: string, state: TimelineState): void {
  timelines.update((list) => list.map((t) => (t.id === id ? { ...t, state } : t)))
}
