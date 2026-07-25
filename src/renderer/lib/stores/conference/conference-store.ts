/**
 * conference-store.ts
 * ──────────────────────────────────────────────
 * 模拟大会状态管理 —— 薄包装层。
 *
 * - 内部使用 ConferenceEngine 实例管理所有状态
 * - 对外保持 writable + derived stores API（向后兼容）
 * - 持久化通过 engine.toJSON() / ConferenceEngine.fromJSON()
 */

import { writable, derived, get } from 'svelte/store'
import type {
  Conference,
  ConferenceDisplayData,
  Delegation,
  AgendaItem,
  SpeakerEntry,
  YieldChoice,
  YieldPendingState,
  Motion,
  DraftResolution,
  VotingSession,
  VoteBallot,
  MinutesEntry,
  MinutesEventType,
  ConferencePhase
} from '$lib/types-conference'
import type { PointType, Point } from '$lib/types-conference'
import { POINT_LABELS } from '$lib/types-conference'
import { ConferenceEngine } from '$lib/engine/ConferenceEngine.svelte'
import { bootstrapStore, saveToStore } from '../store-bridge'

const STORAGE_KEY = 'veto_conferences'
const STORE_DOMAIN = 'conferences'

// ---- 引擎注册表 ----------------------------------------------------------

/** 所有会议引擎实例（按 ID 索引） */
const _engines = new Map<string, ConferenceEngine>()

/** 获取或创建引擎（幂等） */
function getEngine(id: string): ConferenceEngine | undefined {
  return _engines.get(id)
}

/** 注册引擎并从其 JSON 同步到 conferences store */
function registerEngine(engine: ConferenceEngine): void {
  _engines.set(engine.id, engine)
}

/** 注销引擎 */
function unregisterEngine(id: string): void {
  _engines.delete(id)
  engineToStore(id)
}

/** 将引擎当前状态同步到 conferences store */
function syncEngine(engine: ConferenceEngine): void {
  conferences.update((list) =>
    list.map((c) => (c.id === engine.id ? engine.toJSON() : c))
  )
}

/** 将引擎从 store 中移除（不删除引擎，仅清理 store 条目） */
function engineToStore(id: string): void {
  // 引擎状态变化时，调用 syncEngine 即可
}

// ---- 文件持久化（双重写入：localStorage + 文件）--------------------------

function loadConferencesFromStorage(): Conference[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list: Conference[] = JSON.parse(raw)
    // 清理过期状态 & 注册引擎
    const now = Date.now()
    for (const conf of list) {
      if (conf.activeSpeaker && conf.activeSpeaker.endAt <= now) {
        conf.activeSpeaker = null
      }
      if (conf.activeCaucus && conf.activeCaucus.endAt <= now) {
        conf.activeCaucus = null
      }
      // 注册引擎
      const engine = ConferenceEngine.fromJSON(conf)
      registerEngine(engine)
    }
    return list
  } catch {
    return []
  }
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null
function saveConferencesToStorage(confs: Conference[]): void {
  if (typeof localStorage === 'undefined') return
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    const json = JSON.stringify(confs)
    localStorage.setItem(STORAGE_KEY, json)
    // 通过 JSON round-trip 确保纯 JSON 对象（剥离 Svelte $state 代理等）
    saveToStore(STORE_DOMAIN, JSON.parse(json))
  }, 2000)
}

/** 立即保存（绕过防抖），用于离开页面前保存计时器状态 */
export async function saveConferencesNow(): Promise<void> {
  if (typeof localStorage === 'undefined') return
  if (_saveTimer) {
    clearTimeout(_saveTimer)
    _saveTimer = null
  }
  const confs = get(conferences)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(confs))
  await saveToStore(STORE_DOMAIN, confs)
}

// ---- 核心 Stores ----------------------------------------------------------

/** 所有大会列表（Conference JSON 格式，向后兼容） */
export const conferences = writable<Conference[]>(loadConferencesFromStorage())
conferences.subscribe(saveConferencesToStorage)

/** 启动完成 Promise：文件数据已加载并同步到 localStorage */
export const conferencesReady: Promise<void> = bootstrapStore<Conference[]>(STORE_DOMAIN, []).then(
  (data) => {
    const now = Date.now()
    for (const conf of data) {
      if (conf.activeSpeaker && conf.activeSpeaker.endAt <= now) {
        conf.activeSpeaker = null
      }
      if (conf.activeCaucus && conf.activeCaucus.endAt <= now) {
        conf.activeCaucus = null
      }
      const engine = ConferenceEngine.fromJSON(conf)
      registerEngine(engine)
    }
    conferences.set(data)
  }
)

/** 当前激活的大会 ID */
export const currentConferenceId = writable<string | null>(null)

/** 当前大会（派生，向后兼容） */
export const currentConference = derived(
  [conferences, currentConferenceId],
  ([$conferences, $id]) => $conferences.find((c) => c.id === $id) ?? null
)

/** 当前大会引擎（派生，供需要直接访问引擎的组件使用） */
export const currentEngine = derived(
  [conferences, currentConferenceId],
  ([$conferences, $id]) => {
    if (!$id) return null
    // 从引擎注册表获取，如果不存在则从 store 数据创建
    let engine = _engines.get($id)
    if (!engine) {
      const conf = $conferences.find((c) => c.id === $id)
      if (conf) {
        engine = ConferenceEngine.fromJSON(conf)
        registerEngine(engine)
      }
    }
    return engine ?? null
  }
)

/** 动议编辑草稿（实时同步到 Display） */
export const motionDraft = writable<ConferenceDisplayData['motionDraft'] | null>(null)

/** 问题编辑草稿（实时同步到 Display） */
export const pointDraft = writable<ConferenceDisplayData['pointDraft'] | null>(null)

// ---- 内部辅助 -------------------------------------------------------------

/** 更新当前会议：委托给引擎，再同步到 store */
function updateCurrentConference(updater: (conf: Conference) => Conference): void {
  const id = get(currentConferenceId)
  if (!id) return
  conferences.update((list) =>
    list.map((c) => {
      if (c.id !== id) return c
      const updated = updater(c)
      updated.updatedAt = Date.now()
      // 同步引擎
      const engine = _engines.get(id)
      if (engine) {
        // 用更新后的 JSON 重建引擎状态
        const newEngine = ConferenceEngine.fromJSON(updated)
        // 保留引擎实例，直接更新其字段
        engine.name = newEngine.name
        engine.venue = newEngine.venue
        engine.phase = newEngine.phase
        engine.delegations = newEngine.delegations
        engine.agenda = newEngine.agenda
        engine.speakerList = newEngine.speakerList
        engine.motions = newEngine.motions
        engine.dismissedResolvedMotionIds = newEngine.dismissedResolvedMotionIds
        engine.points = newEngine.points
        engine.dismissedPointIds = newEngine.dismissedPointIds
        engine.draftResolutions = newEngine.draftResolutions
        engine.documentNames = newEngine.documentNames
        engine.votingSessions = newEngine.votingSessions
        engine.minutes = newEngine.minutes
        engine.defaultSpeakingTimeSec = newEngine.defaultSpeakingTimeSec
        engine.activeCaucus = newEngine.activeCaucus
        engine.activeSpeaker = newEngine.activeSpeaker
        engine.yieldPending = newEngine.yieldPending
        engine.caucusSetup = newEngine.caucusSetup
        engine.updatedAt = updated.updatedAt
      }
      return updated
    })
  )
}

// ---- CRUD -----------------------------------------------------------------

export function createConference(
  name: string,
  venue: string,
  agendaItems: { title: string; description?: string }[],
  delegations: { name: string; shortName?: string }[],
  options?: { defaultSpeakingTimeSec?: number }
): string {
  const id = crypto.randomUUID()

  const delegationList: Delegation[] = delegations.map((d, i) => ({
    id: crypto.randomUUID(),
    name: d.name,
    shortName: d.shortName,
    attendance: 'absent' as const,
    sortOrder: i
  }))

  const agendaList: AgendaItem[] = agendaItems.map((a, i) => ({
    id: crypto.randomUUID(),
    title: a.title,
    description: a.description,
    sortOrder: i
  }))

  const conf: Conference = {
    id,
    name,
    venue,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    phase: 'preamble',
    delegations: delegationList,
    agenda: agendaList,
    speakerLists: { id: 'main', name: '主发言名单', entries: [] },
    motions: [],
    dismissedResolvedMotionIds: [],
    points: [],
    dismissedPointIds: [],
    draftResolutions: [],
    documentNames: [],
    votingSessions: [],
    minutes: [],
    defaultSpeakingTimeSec: options?.defaultSpeakingTimeSec ?? 120,
    activeCaucus: null,
    activeSpeaker: null
  }

  // 创建并注册引擎
  const engine = new ConferenceEngine(conf)
  engine.addMinutesEntry('conference_created', `大会创建: ${name}（${venue}）`)
  engine.addMinutesEntry('phase_changed', '进入阶段: 会前准备')
  registerEngine(engine)

  conferences.update((list) => [...list, engine.toJSON()])
  currentConferenceId.set(id)
  return id
}

export function deleteConference(id: string): void {
  conferences.update((list) => list.filter((c) => c.id !== id))
  unregisterEngine(id)
  if (get(currentConferenceId) === id) {
    currentConferenceId.set(null)
  }
}

export function renameConference(id: string, name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  const engine = getEngine(id)
  if (engine) {
    engine.name = trimmed
    syncEngine(engine)
  } else {
    conferences.update((list) =>
      list.map((c) => (c.id === id ? { ...c, name: trimmed, updatedAt: Date.now() } : c))
    )
  }
}

export function loadConference(id: string): void {
  const conf = getConferenceById(id)
  if (conf) {
    currentConferenceId.set(id)
  }
}

export function getConferenceById(id: string): Conference | null {
  return get(conferences).find((c) => c.id === id) ?? null
}

// ---- 点名 -----------------------------------------------------------------

export function setAttendance(
  delegationId: string,
  attendance: 'present' | 'absent'
): void {
  updateCurrentConference((c) => ({
    ...c,
    delegations: c.delegations.map((d) => (d.id === delegationId ? { ...d, attendance } : d))
  }))
}

export function completeRollCall(): void {
  updateCurrentConference((c) => {
    const presentCount = c.delegations.filter((d) => d.attendance === 'present').length
    const simpleMajority = Math.floor(presentCount / 2) + 1
    const twoThirds = Math.ceil((presentCount * 2) / 3)

    const entry: MinutesEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType: 'roll_call_completed',
      description: `点名完成: 实到 ${presentCount}/${c.delegations.length}，简单多数 ${simpleMajority} 票，2/3多数 ${twoThirds} 票`
    }
    const phaseEntry: MinutesEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType: 'phase_changed',
      description: '进入阶段: 等待开启主发言名单'
    }

    return { ...c, phase: 'pending_speakers_list', minutes: [...c.minutes, entry, phaseEntry] }
  })
}

export function resetRollCall(): void {
  updateCurrentConference((c) => {
    const entry1: MinutesEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType: 'roll_call_reset',
      description: '重新点名: 所有代表团出席状态已重置'
    }
    const entry2: MinutesEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      eventType: 'phase_changed',
      description: '进入阶段: 点名'
    }

    return {
      ...c,
      phase: 'roll_call',
      delegations: c.delegations.map((d) => ({ ...d, attendance: 'absent' as const })),
      minutes: [...c.minutes, entry1, entry2]
    }
  })
}

// ---- 代表团管理 ------------------------------------------------------------

export function addDelegation(name: string, shortName?: string): string {
  const id = crypto.randomUUID()
  const conf = get(currentConference)
  const sortOrder = conf?.delegations.length ?? 0

  updateCurrentConference((c) => ({
    ...c,
    delegations: [
      ...c.delegations,
      { id, name, shortName: shortName || undefined, attendance: 'absent' as const, sortOrder }
    ]
  }))
  return id
}

export function removeDelegation(id: string): void {
  updateCurrentConference((c) => ({
    ...c,
    delegations: c.delegations.filter((d) => d.id !== id)
  }))
}

export function updateDelegation(id: string, updates: Partial<Delegation>): void {
  updateCurrentConference((c) => ({
    ...c,
    delegations: c.delegations.map((d) => (d.id === id ? { ...d, ...updates } : d))
  }))
}

// ---- 主发言名单 ------------------------------------------------------------

export function openSpeakersList(): void {
  addMinutesEntry('phase_changed', '主发言名单已开启')
}

export function addToSpeakersList(delegationId: string, customTimeSec?: number): string {
  const id = crypto.randomUUID()
  const conf = get(currentConference)
  const timeSec = customTimeSec ?? conf?.defaultSpeakingTimeSec ?? 120

  updateCurrentConference((c) => ({
    ...c,
    speakerLists: { ...c.speakerLists!, entries: [...c.speakerLists!.entries, {
      id,
      delegationId,
      addedAt: Date.now(),
      allocatedTimeSec: timeSec,
      status: 'waiting' as const
    }] }
  }))

  const del = conf?.delegations.find((d) => d.id === delegationId)
  addMinutesEntry('speaker_started', `${del?.name ?? delegationId} 加入主发言名单`)
  return id
}

export function removeFromSpeakersList(entryId: string): void {
  updateCurrentConference((c) => ({
    ...c,
    speakerLists: { ...c.speakerLists!, entries: c.speakerLists!.entries.filter((s) => s.id !== entryId) }
  }))
}

export function readySpeaker(entryId: string): void {
  updateCurrentConference((c) => ({
    ...c,
    speakerLists: { ...c.speakerLists!, entries: c.speakerLists!.entries.map((s) => (s.id === entryId ? { ...s, status: 'ready' as const } : s)) }
  }))

  const conf = get(currentConference)
  const entry = conf?.speakerLists?.entries.find((s) => s.id === entryId)
  const del = conf?.delegations.find((d) => d.id === entry?.delegationId)
  addMinutesEntry('phase_changed', `${del?.name ?? entry?.delegationId} 准备发言`)
}

export function startSpeaker(entryId: string): void {
  const now = Date.now()
  const conf = get(currentConference)
  const entry = conf?.speakerLists?.entries.find((s) => s.id === entryId)
  const allocatedSec = entry?.allocatedTimeSec ?? 120
  const endAt = now + allocatedSec * 1000

  updateCurrentConference((c) => ({
    ...c,
    speakerLists: { ...c.speakerLists!, entries: c.speakerLists!.entries.map((s) =>
      s.id === entryId ? { ...s, status: 'speaking' as const, remainingTimeSec: undefined } : s
    ) },
    activeSpeaker: { entryId, startedAt: now, endAt }
  }))

  const del = conf?.delegations.find((d) => d.id === entry?.delegationId)
  addMinutesEntry(
    'speaker_started',
    `${del?.name ?? entry?.delegationId} 开始发言 (${allocatedSec}秒)`
  )
}

export function pauseSpeaker(): void {
  const now = Date.now()
  updateCurrentConference((c) => {
    if (!c.activeSpeaker) return c
    return {
      ...c,
      activeSpeaker: { ...c.activeSpeaker, pausedAt: now }
    }
  })
}

export function resumeSpeaker(remainingSec: number): void {
  const now = Date.now()
  const newEndAt = now + remainingSec * 1000
  updateCurrentConference((c) => {
    if (!c.activeSpeaker) return c
    return {
      ...c,
      activeSpeaker: {
        ...c.activeSpeaker,
        startedAt: now,
        endAt: newEndAt,
        pausedAt: undefined
      },
      yieldPending: null
    }
  })
}

export function endSpeaker(yieldChoice?: YieldChoice): void {
  const conf = get(currentConference)
  const currentSpeaker = conf?.activeSpeaker
  if (!currentSpeaker) return

  const entry = conf?.speakerLists?.entries.find((s) => s.id === currentSpeaker.entryId)
  const elapsed = (Date.now() - currentSpeaker.startedAt) / 1000
  const remaining = Math.max(0, (entry?.allocatedTimeSec ?? 120) - elapsed)

  updateCurrentConference((c) => ({
    ...c,
    speakerLists: { ...c.speakerLists!, entries: c.speakerLists!.entries.filter((s) => s.id !== currentSpeaker.entryId) },
    activeSpeaker: null,
    yieldPending: null
  }))

  const del = conf?.delegations.find((d) => d.id === entry?.delegationId)
  let logMsg = `${del?.name ?? entry?.delegationId} 发言结束`
  if (yieldChoice) {
    const yieldLabels: Record<string, string> = {
      chair: '让渡给主席团',
      delegate: '让渡给另一位代表',
      question: '让渡给提问',
      comment: '让渡给评论'
    }
    logMsg += `（${yieldLabels[yieldChoice.type] ?? yieldChoice.type}，剩余 ${Math.round(remaining)} 秒）`
    addMinutesEntry('yield', logMsg, { delegationId: entry?.delegationId })
  } else {
    addMinutesEntry('speaker_finished', logMsg, { delegationId: entry?.delegationId })
  }
}

// ---- 让渡 -----------------------------------------------------------------

export function handleYield(yieldChoice: YieldChoice): void {
  const conf = get(currentConference)
  const currentSpeaker = conf?.activeSpeaker
  if (!currentSpeaker) return

  const entry = conf?.speakerLists?.entries.find((s) => s.id === currentSpeaker.entryId)
  if (!entry) return

  const elapsed = (Date.now() - currentSpeaker.startedAt) / 1000
  const remaining = Math.max(0, (entry?.allocatedTimeSec ?? 120) - elapsed)
  const del = conf?.delegations.find((d) => d.id === entry?.delegationId)

  updateCurrentConference((c) => ({
    ...c,
    speakerLists: { ...c.speakerLists!, entries: c.speakerLists!.entries.map((s) =>
      s.id === entry.id ? { ...s, yield: yieldChoice } : s
    ) }
  }))

  const yieldLabels: Record<string, string> = {
    chair: '让渡给主席团',
    delegate: '让渡给另一位代表',
    question: '让渡给提问',
    comment: '让渡给评论'
  }
  const logMsg = `${del?.name ?? entry?.delegationId} ${yieldLabels[yieldChoice.type] ?? yieldChoice.type}（剩余 ${Math.round(remaining)} 秒）`
  addMinutesEntry('yield', logMsg, { delegationId: entry?.delegationId })

  if (yieldChoice.type === 'chair') {
    resolveYieldToChair()
    return
  }

  const delegationName = del?.name ?? entry?.delegationId
  updateCurrentConference((c) => ({
    ...c,
    activeSpeaker: c.activeSpeaker
      ? { ...c.activeSpeaker, pausedAt: Date.now() }
      : null,
    yieldPending: {
      originalEntryId: entry.id,
      originalDelegationId: entry.delegationId,
      originalDelegationName: delegationName,
      yieldType: yieldChoice.type as 'delegate' | 'question' | 'comment',
      remainingSec: remaining,
      allocatedSec: entry.allocatedTimeSec
    }
  }))
}

export function resolveYieldToChair(): void {
  const conf = get(currentConference)
  if (!conf?.yieldPending && !conf?.activeSpeaker) return

  const yp = conf?.yieldPending
  const entryId = yp?.originalEntryId ?? conf?.activeSpeaker?.entryId

  updateCurrentConference((c) => ({
    ...c,
    speakerLists: { ...c.speakerLists!, entries: c.speakerLists!.entries.filter((s) => s.id !== entryId) },
    activeSpeaker: null,
    yieldPending: null
  }))

  if (yp) {
    addMinutesEntry('speaker_finished',
      `${yp.originalDelegationName} 让渡给主席团，剩余时间作废`,
      { delegationId: yp.originalDelegationId })
  }
}

export function resolveYieldToDelegate(targetDelegationId: string): void {
  const conf = get(currentConference)
  if (!conf?.yieldPending || conf.yieldPending.yieldType !== 'delegate') return

  const yp = conf.yieldPending
  const targetDel = conf.delegations.find((d) => d.id === targetDelegationId)
  if (!targetDel) return

  const newEntry: SpeakerEntry = {
    id: crypto.randomUUID(),
    delegationId: targetDelegationId,
    addedAt: Date.now(),
    allocatedTimeSec: Math.round(yp.remainingSec),
    status: 'ready',
    canYield: false
  }

  updateCurrentConference((c) => ({
    ...c,
    speakerLists: { ...c.speakerLists!, entries: [
      newEntry,
      ...c.speakerLists!.entries.filter((s) => s.id !== yp.originalEntryId)
    ] },
    activeSpeaker: null,
    yieldPending: null
  }))

  addMinutesEntry('speaker_finished',
    `${yp.originalDelegationName} 让渡给 ${targetDel.name}（剩余 ${Math.round(yp.remainingSec)} 秒）`,
    { delegationId: yp.originalDelegationId })
}

export function resolveYieldToQuestion(questionerDelegationId: string): void {
  const conf = get(currentConference)
  if (!conf?.yieldPending || conf.yieldPending.yieldType !== 'question') return

  const yp = conf.yieldPending
  const questionerDel = conf.delegations.find((d) => d.id === questionerDelegationId)
  if (!questionerDel) return

  updateCurrentConference((c) => ({
    ...c,
    activeSpeaker: c.activeSpeaker
      ? { ...c.activeSpeaker, pausedAt: c.activeSpeaker.pausedAt ?? Date.now() }
      : null,
    speakerLists: { ...c.speakerLists!, entries: c.speakerLists!.entries.map((s) =>
      s.id === yp.originalEntryId ? { ...s, canYield: false } : s
    ) },
    yieldPending: {
      ...yp,
      questionerDelegationId: questionerDel.id,
      questionerDelegationName: questionerDel.name
    }
  }))

  addMinutesEntry('yield',
    `${questionerDel.name} 向 ${yp.originalDelegationName} 提问（剩余 ${Math.round(yp.remainingSec)} 秒回答）`,
    { delegationId: questionerDel.id })
}

export function resolveYieldToComment(commenterDelegationId: string): void {
  const conf = get(currentConference)
  if (!conf?.yieldPending || conf.yieldPending.yieldType !== 'comment') return

  const yp = conf.yieldPending
  const commenterDel = conf.delegations.find((d) => d.id === commenterDelegationId)
  if (!commenterDel) return

  const newEntry: SpeakerEntry = {
    id: crypto.randomUUID(),
    delegationId: commenterDelegationId,
    addedAt: Date.now(),
    allocatedTimeSec: Math.round(yp.remainingSec),
    status: 'ready',
    canYield: false
  }

  updateCurrentConference((c) => ({
    ...c,
    speakerLists: { ...c.speakerLists!, entries: [
      newEntry,
      ...c.speakerLists!.entries.filter((s) => s.id !== yp.originalEntryId)
    ] },
    activeSpeaker: null,
    yieldPending: null
  }))

  addMinutesEntry('yield',
    `${commenterDel.name} 获得 ${Math.round(yp.remainingSec)} 秒评论时间（来自 ${yp.originalDelegationName} 的让渡）`,
    { delegationId: commenterDel.id })
}

export function cancelYieldPending(): void {
  updateCurrentConference((c) => ({
    ...c,
    yieldPending: null
  }))
}

// ---- 动议 -----------------------------------------------------------------

export function proposeMotion(motionData: Omit<Motion, 'id' | 'proposedAt' | 'status'>): string {
  const id = crypto.randomUUID()
  const now = Date.now()

  const motion = { ...motionData, id, proposedAt: now, status: 'pending' as const } as Motion

  updateCurrentConference((c) => ({
    ...c,
    motions: [...c.motions, motion]
  }))

  const conf = get(currentConference)
  const del = conf?.delegations.find((d) => d.id === motion.proposedByDelegationId)
  const motionLabel =
    motion.type === 'moderated_caucus' ? `有主持核心磋商: ${(motion as any).topic}` : motion.type
  addMinutesEntry(
    'motion_proposed',
    `${del?.name ?? motion.proposedByDelegationId} 提出动议: ${motionLabel}`,
    { delegationId: motion.proposedByDelegationId, motionId: id }
  )

  return id
}

export function proposePoint(data: {
  type: PointType
  proposedByDelegationId: string
}): string {
  const id = crypto.randomUUID()
  const now = Date.now()

  const point: Point = {
    id,
    type: data.type,
    proposedByDelegationId: data.proposedByDelegationId,
    proposedAt: now
  }

  updateCurrentConference((c) => ({
    ...c,
    points: [...c.points, point]
  }))

  const conf = get(currentConference)
  const del = conf?.delegations.find((d) => d.id === point.proposedByDelegationId)
  const pointLabel = POINT_LABELS[point.type]
  addMinutesEntry(
    'point_proposed',
    `${del?.name ?? point.proposedByDelegationId} 提出${pointLabel}`,
    { delegationId: point.proposedByDelegationId }
  )

  return id
}

export function dismissLatestPoint(): void {
  updateCurrentConference((c) => {
    if (c.points.length === 0) return c
    const lastPoint = c.points[c.points.length - 1]
    if (c.dismissedPointIds.includes(lastPoint.id)) return c
    return {
      ...c,
      dismissedPointIds: [...c.dismissedPointIds, lastPoint.id]
    }
  })
}

export function approveMotion(motionId: string): void {
  const conf = get(currentConference)
  const motion = conf?.motions.find((m) => m.id === motionId)
  if (!motion) return

  updateCurrentConference((c) => ({
    ...c,
    motions: c.motions.map((m) => (m.id === motionId ? { ...m, status: 'approved' as const } : m))
  }))
  addMinutesEntry('motion_approved', '动议通过', { motionId })
  executeMotionAction(motion)
}

export function rejectMotion(motionId: string): void {
  updateCurrentConference((c) => ({
    ...c,
    motions: c.motions.map((m) => (m.id === motionId ? { ...m, status: 'rejected' as const } : m))
  }))
  addMinutesEntry('motion_rejected', '动议未通过', { motionId })
}

export function dismissLastResolvedMotion(): void {
  updateCurrentConference((c) => {
    const resolved = c.motions
      .filter((m) => m.status === 'approved' || m.status === 'rejected')
      .filter((m) => !c.dismissedResolvedMotionIds.includes(m.id))
    const last = resolved.length > 0 ? resolved[resolved.length - 1] : null
    if (!last) return c
    return {
      ...c,
      dismissedResolvedMotionIds: [...c.dismissedResolvedMotionIds, last.id]
    }
  })
}

function executeMotionAction(motion: Motion): void {
  const conf = get(currentConference)
  if (!conf) return

  switch (motion.type) {
    case 'open_speakers_list':
      updateCurrentConference((c) => {
        const now = Date.now()
        const endedSessions = c.votingSessions.map((s) =>
          !s.endedAt ? { ...s, endedAt: now } : s
        )
        return { ...c, phase: 'general_debate', votingSessions: endedSessions }
      })
      addMinutesEntry('phase_changed', '进入阶段: 一般性辩论（主发言名单已开启）')
      break
    case 'moderated_caucus': {
      if (conf.activeSpeaker) {
        const speaker = conf.speakerLists?.entries.find((s) => s.id === conf.activeSpeaker!.entryId)
        if (!speaker?.yield) {
          updateCurrentConference((c) => ({
            ...c,
            activeSpeaker: null,
            speakerLists: { ...c.speakerLists!, entries: c.speakerLists!.entries.filter((s) => s.id !== conf.activeSpeaker!.entryId) }
          }))
          addMinutesEntry('speaker_interrupted', '发言人时间作废（磋商动议通过）')
        }
      }
      const proposerDelId = (motion as any).proposedByDelegationId as string
      updateCurrentConference((c) => ({
        ...c,
        phase: 'caucus_setup',
        caucusSetup: {
          motionId: motion.id,
          proposerPosition: 'first',
          speakerDelegationIds: proposerDelId ? [proposerDelId] : []
        }
      }))
      break
    }
    case 'unmoderated_caucus':
      startCaucusImpl(motion.id, conf)
      break
    case 'suspend_meeting':
      updateCurrentConference((c) => ({
        ...c,
        phase: 'suspended',
        activeSpeaker: null,
        activeCaucus: null
      }))
      addMinutesEntry('meeting_suspended', '暂时休会')
      addMinutesEntry('phase_changed', '进入阶段: 休会')
      break
    case 'close_meeting':
      updateCurrentConference((c) => ({
        ...c,
        phase: 'closed',
        activeSpeaker: null,
        activeCaucus: null
      }))
      addMinutesEntry('meeting_closed', '会议闭幕')
      addMinutesEntry('phase_changed', '进入阶段: 闭幕')
      break
    case 'modify_speaking_time':
      updateCurrentConference((c) => ({
        ...c,
        defaultSpeakingTimeSec: (motion as any).newTimeSec,
        speakerLists: { ...c.speakerLists!, entries: c.speakerLists!.entries.map((s) =>
          s.status === 'waiting' || s.status === 'ready'
            ? { ...s, allocatedTimeSec: (motion as any).newTimeSec }
            : s
        ) }
      }))
      break
    case 'closure_debate': {
      if (conf.activeSpeaker) {
        updateCurrentConference((c) => ({ ...c, activeSpeaker: null }))
      }
      if (conf.activeCaucus) {
        updateCurrentConference((c) => ({ ...c, activeCaucus: null }))
        addMinutesEntry('caucus_ended', '辩论结束，磋商终止')
      }
      updateCurrentConference((c) => ({ ...c, phase: 'voting' }))
      addMinutesEntry('phase_changed', '进入阶段: 投票表决')
      break
    }
    case 'substantive_vote': {
      const docName = (motion as any).documentName as string
      if (docName) addDocumentName(docName)
      const sessionId = startVotingSession('motion', motion.id, 'two_thirds')
      addMinutesEntry('voting_started', `对「${docName || '未命名文件'}」开始实质性投票 (2/3多数)`)
      break
    }
  }
}

function startCaucusImpl(motionId: string, conf: Conference): void {
  const motion = conf.motions.find((m) => m.id === motionId)
  if (!motion) return

  const now = Date.now()
  let endAt = now
  let caucusType: 'moderated' | 'unmoderated' = 'unmoderated'
  let topic: string | undefined

  if (motion.type === 'moderated_caucus') {
    caucusType = 'moderated'
    endAt = now + (motion as any).totalTimeSec * 1000
    topic = (motion as any).topic
  } else if (motion.type === 'unmoderated_caucus') {
    caucusType = 'unmoderated'
    endAt = now + (motion as any).durationSec * 1000
  }

  updateCurrentConference((c) => ({
    ...c,
    phase: 'caucus',
    activeCaucus: { motionId, type: caucusType, startedAt: now, endAt, elapsedSec: 0 }
  }))

  const label = caucusType === 'moderated' ? '有主持核心磋商' : '自由磋商'
  addMinutesEntry('caucus_started', `${label}开始${topic ? ': ' + topic : ''}`, { motionId })
  addMinutesEntry('phase_changed', '进入阶段: 磋商')
}

export function startCaucus(motionId: string): void {
  const conf = get(currentConference)
  const motion = conf?.motions.find((m) => m.id === motionId)
  if (!motion) return

  const now = Date.now()
  let endAt = now
  let caucusType: 'moderated' | 'unmoderated' = 'unmoderated'
  let topic: string | undefined

  if (motion.type === 'moderated_caucus') {
    caucusType = 'moderated'
    endAt = now + (motion as any).totalTimeSec * 1000
    topic = (motion as any).topic
  } else if (motion.type === 'unmoderated_caucus') {
    caucusType = 'unmoderated'
    endAt = now + (motion as any).durationSec * 1000
  }

  updateCurrentConference((c) => ({
    ...c,
    phase: 'caucus',
    activeCaucus: { motionId, type: caucusType, startedAt: now, endAt, elapsedSec: 0 }
  }))

  const label = caucusType === 'moderated' ? '有主持核心磋商' : '自由磋商'
  addMinutesEntry('caucus_started', `${label}开始${topic ? ': ' + topic : ''}`, { motionId })
  addMinutesEntry('phase_changed', '进入阶段: 磋商')
}

export function setCaucusProposerPosition(position: 'first' | 'last'): void {
  updateCurrentConference((c) => {
    if (!c.caucusSetup) return c
    const motion = c.motions.find((m) => m.id === c.caucusSetup!.motionId)
    const proposerId = (motion as any)?.proposedByDelegationId as string | undefined
    if (!proposerId) return { ...c, caucusSetup: { ...c.caucusSetup, proposerPosition: position } }

    const ids = c.caucusSetup.speakerDelegationIds.filter((id) => id !== proposerId)
    const reordered = position === 'first' ? [proposerId, ...ids] : [...ids, proposerId]

    return {
      ...c,
      caucusSetup: { ...c.caucusSetup, proposerPosition: position, speakerDelegationIds: reordered }
    }
  })
}

export function addToCaucusSpeakers(delegationId: string): void {
  updateCurrentConference((c) => {
    if (!c.caucusSetup) return c
    if (c.caucusSetup.speakerDelegationIds.includes(delegationId)) return c

    const motion = c.motions.find((m) => m.id === c.caucusSetup!.motionId)
    const proposerId = (motion as any)?.proposedByDelegationId as string | undefined

    const ids = c.caucusSetup.speakerDelegationIds
    const newIds =
      c.caucusSetup.proposerPosition === 'last' && proposerId
        ? [...ids.slice(0, -1), delegationId, proposerId]
        : [...ids, delegationId]

    const perSpeakerSec = (motion as any)?.speakingTimePerPersonSec ?? 60
    const totalSec = c.caucusSetup.remainingSec ?? (motion as any)?.totalTimeSec ?? 0
    const maxSpeakers = Math.floor(totalSec / perSpeakerSec)
    if (newIds.length > maxSpeakers) return c

    return {
      ...c,
      caucusSetup: { ...c.caucusSetup, speakerDelegationIds: newIds }
    }
  })
}

export function removeFromCaucusSpeakers(delegationId: string): void {
  updateCurrentConference((c) => {
    if (!c.caucusSetup) return c
    return {
      ...c,
      caucusSetup: {
        ...c.caucusSetup,
        speakerDelegationIds: c.caucusSetup.speakerDelegationIds.filter((id) => id !== delegationId)
      }
    }
  })
}

export function startCaucusWithSetup(): void {
  const conf = get(currentConference)
  if (!conf?.caucusSetup) return

  const { motionId, speakerDelegationIds, remainingSec } = conf.caucusSetup
  const motion = conf.motions.find((m) => m.id === motionId)
  if (!motion) return

  const now = Date.now()
  const perSpeakerSec = ((motion as any).speakingTimePerPersonSec as number) ?? 60
  const totalSec = remainingSec ?? ((motion as any).totalTimeSec as number)
  const topic = (motion as any).topic

  const maxSpeakers = Math.max(1, Math.floor(totalSec / perSpeakerSec))
  const trimmedIds = speakerDelegationIds.slice(0, maxSpeakers)

  const caucusSpeakers: SpeakerEntry[] = trimmedIds.map((delId) => {
    const del = conf.delegations.find((d) => d.id === delId)
    return {
      id: crypto.randomUUID(),
      delegationId: delId,
      addedAt: now,
      allocatedTimeSec: perSpeakerSec,
      status: 'waiting' as const,
      delegationName: del?.name ?? delId
    }
  })

  if (caucusSpeakers.length > 0) {
    caucusSpeakers[0] = { ...caucusSpeakers[0], status: 'ready' }
  }

  updateCurrentConference((c) => ({
    ...c,
    phase: 'caucus',
    caucusSetup: null,
    activeCaucus: {
      motionId,
      type: 'moderated',
      startedAt: now,
      endAt: now + totalSec * 1000,
      elapsedSec: 0,
      caucusSpeakers,
      currentSpeakerIndex: caucusSpeakers.length > 0 ? 0 : undefined
    },
    activeSpeaker: null
  }))

  const firstName = caucusSpeakers[0]?.delegationName ?? ''
  addMinutesEntry(
    'caucus_started',
    `有主持核心磋商开始${topic ? ': ' + topic : ''}，首位发言人（就绪）: ${firstName}`,
    { motionId }
  )
  addMinutesEntry('phase_changed', '进入阶段: 磋商')
}

export function advanceCaucusSpeaker(): void {
  const conf = get(currentConference)
  if (!conf?.activeCaucus?.caucusSpeakers) return

  const speakers = conf.activeCaucus.caucusSpeakers
  const currentIdx = conf.activeCaucus.currentSpeakerIndex ?? -1

  const updatedSpeakers = speakers.filter((_, i) => i !== currentIdx)

  const totalRemaining = (conf.activeCaucus.endAt - Date.now()) / 1000
  const motion = conf.motions.find((m) => m.id === conf.activeCaucus!.motionId) as any
  const perSpeakerSec = motion?.speakingTimePerPersonSec ?? 60
  const nextIdx = currentIdx

  if (nextIdx < updatedSpeakers.length && totalRemaining >= perSpeakerSec) {
    updatedSpeakers[nextIdx] = { ...updatedSpeakers[nextIdx], status: 'ready' }
    const nextName = updatedSpeakers[nextIdx].delegationName

    updateCurrentConference((c) => ({
      ...c,
      activeCaucus: {
        ...c.activeCaucus!,
        caucusSpeakers: updatedSpeakers,
        currentSpeakerIndex: nextIdx
      },
      activeSpeaker: null
    }))
    addMinutesEntry('speaker_ready', `${nextName} 准备发言（等待主席开始计时）`)
  } else if (nextIdx < updatedSpeakers.length && totalRemaining < perSpeakerSec) {
    endCaucus()
  } else if (totalRemaining >= perSpeakerSec) {
    updateCurrentConference((c) => ({
      ...c,
      phase: 'caucus_setup',
      activeCaucus: null,
      activeSpeaker: null,
      caucusSetup: {
        motionId: c.activeCaucus!.motionId,
        proposerPosition: 'first',
        speakerDelegationIds: [],
        remainingSec: totalRemaining
      }
    }))
    addMinutesEntry('caucus_paused', '名单已走完，返回磋商准备以添加更多发言人')
  } else {
    endCaucus()
  }
}

export function startCaucusSpeaker(): void {
  const conf = get(currentConference)
  if (!conf?.activeCaucus?.caucusSpeakers) return

  const speakers = conf.activeCaucus.caucusSpeakers
  const readyIdx = speakers.findIndex((s) => s.status === 'ready')
  if (readyIdx < 0) return

  const readySpeaker = speakers[readyIdx]
  const perSpeakerSec = readySpeaker.allocatedTimeSec
  const now = Date.now()

  const updatedSpeakers = speakers.map((s, i) =>
    i === readyIdx ? { ...s, status: 'speaking' as const } : s
  )

  updateCurrentConference((c) => ({
    ...c,
    activeCaucus: {
      ...c.activeCaucus!,
      caucusSpeakers: updatedSpeakers,
      currentSpeakerIndex: readyIdx
    },
    activeSpeaker: {
      entryId: readySpeaker.delegationId,
      startedAt: now,
      endAt: now + perSpeakerSec * 1000
    }
  }))

  addMinutesEntry('speaker_started', `${readySpeaker.delegationName} 开始发言 (${perSpeakerSec}秒)`)
}

export function appendCaucusSpeaker(delegationId: string): void {
  const conf = get(currentConference)
  if (!conf?.activeCaucus?.caucusSpeakers) return

  const currentSpeakers = conf.activeCaucus.caucusSpeakers
  if (currentSpeakers.some((s) => s.delegationId === delegationId)) return

  const del = conf.delegations.find((d) => d.id === delegationId)
  const motion = conf.motions.find((m) => m.id === conf.activeCaucus!.motionId) as any
  const perSpeakerSec = motion?.speakingTimePerPersonSec ?? 60

  const totalRemaining = (conf.activeCaucus.endAt - Date.now()) / 1000
  const futureCount = currentSpeakers.length + 1
  if (futureCount * perSpeakerSec > totalRemaining) return

  const newSpeaker: SpeakerEntry = {
    id: crypto.randomUUID(),
    delegationId,
    addedAt: Date.now(),
    allocatedTimeSec: perSpeakerSec,
    status: 'waiting' as const,
    delegationName: del?.name ?? delegationId
  }

  const hasActiveSpeaker = conf.activeSpeaker != null

  if (hasActiveSpeaker) {
    updateCurrentConference((c) => ({
      ...c,
      activeCaucus: {
        ...c.activeCaucus!,
        caucusSpeakers: [...currentSpeakers, newSpeaker]
      }
    }))
  } else {
    updateCurrentConference((c) => ({
      ...c,
      activeCaucus: {
        ...c.activeCaucus!,
        caucusSpeakers: [...currentSpeakers, { ...newSpeaker, status: 'ready' }],
        currentSpeakerIndex: c.activeCaucus!.caucusSpeakers.length
      }
    }))
    addMinutesEntry('speaker_ready', `${del?.name ?? delegationId} 准备发言（等待主席开始计时）`)
  }
}

export function pauseCaucus(): void {
  const now = Date.now()
  updateCurrentConference((c) => {
    if (!c.activeCaucus) return c
    return { ...c, activeCaucus: { ...c.activeCaucus, pausedAt: now } }
  })
}

export function resumeCaucus(remainingSec: number): void {
  const now = Date.now()
  const newEndAt = now + remainingSec * 1000
  updateCurrentConference((c) => {
    if (!c.activeCaucus) return c
    return {
      ...c,
      activeCaucus: { ...c.activeCaucus, endAt: newEndAt, pausedAt: undefined }
    }
  })
}

export function endCaucus(): void {
  updateCurrentConference((c) => ({
    ...c,
    phase: 'general_debate',
    activeCaucus: null
  }))
  addMinutesEntry('caucus_ended', '磋商结束')
  addMinutesEntry('phase_changed', '进入阶段: 一般性辩论')
}

// ---- 投票 -----------------------------------------------------------------

export function startVotingSession(
  targetType: 'motion' | 'resolution',
  targetId: string,
  majorityRule: 'simple_majority' | 'two_thirds'
): string {
  const id = crypto.randomUUID()
  const session: VotingSession = {
    id,
    targetType,
    targetId,
    majorityRule,
    ballots: [],
    startedAt: Date.now(),
    currentDelegationId: null,
    round: 1
  }

  updateCurrentConference((c) => {
    const presentDelegations = [...c.delegations]
      .filter((d) => d.attendance === 'present')
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const firstDelegationId = presentDelegations[0]?.id ?? null

    return {
      ...c,
      phase: 'voting',
      votingSessions: [...c.votingSessions, { ...session, currentDelegationId: firstDelegationId }]
    }
  })

  addMinutesEntry(
    'voting_started',
    `开始投票表决 (${majorityRule === 'simple_majority' ? '简单多数' : '2/3多数'})`
  )
  addMinutesEntry('phase_changed', '进入阶段: 投票表决')

  return id
}

export function castVote(
  sessionId: string,
  delegationId: string,
  vote: 'yes' | 'no' | 'abstain' | 'skip'
): void {
  updateCurrentConference((c) => {
    const session = c.votingSessions.find((s) => s.id === sessionId)
    if (!session) return c

    if (session.currentDelegationId !== delegationId) {
      console.warn(`castVote: delegation ${delegationId} is not the current voter`)
      return c
    }

    if (session.round >= 2 && (vote === 'abstain' || vote === 'skip')) {
      console.warn(`castVote: round ${session.round} does not allow ${vote}`)
      return c
    }

    const existing = session.ballots.findIndex((b) => b.delegationId === delegationId)
    const newBallot: VoteBallot = { delegationId, vote }
    let ballots: VoteBallot[]
    if (existing >= 0) {
      ballots = session.ballots.map((b, i) => (i === existing ? newBallot : b))
    } else {
      ballots = [...session.ballots, newBallot]
    }

    const presentDelegations = [...c.delegations]
      .filter((d) => d.attendance === 'present')
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const { nextDelegationId, nextRound } = advanceVoting(
      session.round,
      delegationId,
      ballots,
      presentDelegations
    )

    return {
      ...c,
      votingSessions: c.votingSessions.map((s) =>
        s.id === sessionId
          ? { ...s, ballots, currentDelegationId: nextDelegationId, round: nextRound }
          : s
      )
    }
  })
}

function advanceVoting(
  currentRound: number,
  justVotedDelegationId: string,
  ballots: VoteBallot[],
  presentDelegations: Delegation[]
): { nextDelegationId: string | null; nextRound: number } {
  if (currentRound === 1) {
    const currentIdx = presentDelegations.findIndex((d) => d.id === justVotedDelegationId)
    const nextDelegation = presentDelegations[currentIdx + 1]
    if (nextDelegation) {
      return { nextDelegationId: nextDelegation.id, nextRound: 1 }
    }
    const skippedIds = new Set(ballots.filter((b) => b.vote === 'skip').map((b) => b.delegationId))
    if (skippedIds.size > 0) {
      const firstSkipped = presentDelegations.find((d) => skippedIds.has(d.id))
      return { nextDelegationId: firstSkipped?.id ?? null, nextRound: 2 }
    }
    return { nextDelegationId: null, nextRound: 1 }
  }

  const skippedDelegations = presentDelegations.filter((d) => {
    const ballot = ballots.find((b) => b.delegationId === d.id)
    return ballot?.vote === 'skip'
  })
  const currentSkippedIdx = skippedDelegations.findIndex((d) => d.id === justVotedDelegationId)
  const nextSkipped = skippedDelegations[currentSkippedIdx + 1]
  if (nextSkipped) {
    return { nextDelegationId: nextSkipped.id, nextRound: 2 }
  }
  return { nextDelegationId: null, nextRound: 2 }
}

export function closeVotingSession(sessionId: string): void {
  updateCurrentConference((c) => {
    const session = c.votingSessions.find((s) => s.id === sessionId)
    if (!session) return c

    if (session.currentDelegationId !== null) {
      console.warn('closeVotingSession: not all delegations have voted yet')
      return c
    }

    const { yes, no, abstain } = tallyVotes(session.ballots)
    const presentCount = c.delegations.filter((d) => d.attendance === 'present').length
    const threshold =
      session.majorityRule === 'simple_majority'
        ? Math.floor(presentCount / 2) + 1
        : Math.ceil((presentCount * 2) / 3)
    const result: 'passed' | 'failed' = yes >= threshold ? 'passed' : 'failed'

    const now = Date.now()

    let newMotions = c.motions
    let newPhase = c.phase
    let newActiveSpeaker = c.activeSpeaker
    let newActiveCaucus = c.activeCaucus
    let newDefaultSpeakingTimeSec = c.defaultSpeakingTimeSec
    let newSpeakersList = c.speakerLists!.entries

    const newMinutes: MinutesEntry[] = [
      ...c.minutes,
      {
        id: crypto.randomUUID(),
        timestamp: now,
        eventType: 'voting_ended' as MinutesEventType,
        description: `投票结束: Yes ${yes} / No ${no} / Abstain ${abstain} → ${result === 'passed' ? '通过' : '未通过'}`
      }
    ]

    if (session.targetType === 'motion') {
      const motion = c.motions.find((m) => m.id === session.targetId)
      if (motion) {
        if (motion.type === 'substantive_vote') {
          newSpeakersList = []
          newMinutes.push({
            id: crypto.randomUUID(),
            timestamp: now,
            eventType: 'phase_changed' as MinutesEventType,
            description: '主发言名单已结束'
          })
        } else {
          const motionStatus: 'approved' | 'rejected' = result === 'passed' ? 'approved' : 'rejected'
          newMotions = c.motions.map((m) =>
            m.id === session.targetId ? { ...m, status: motionStatus } : m
          )

          if (result === 'passed') {
            if (motion.type === 'suspend_meeting') {
              newPhase = 'suspended'
              newActiveSpeaker = null
              newActiveCaucus = null
              // ... minutes entries added below
            } else if (motion.type === 'close_meeting') {
              newPhase = 'closed'
              newActiveSpeaker = null
              newActiveCaucus = null
            } else if (motion.type === 'closure_debate') {
              newPhase = 'voting'
              newActiveSpeaker = null
              newActiveCaucus = null
            } else if (motion.type === 'unmoderated_caucus') {
              const durationSec = (motion as any).durationSec as number
              newPhase = 'caucus'
              newActiveSpeaker = null
              newActiveCaucus = {
                motionId: motion.id,
                type: 'unmoderated',
                startedAt: now,
                endAt: now + durationSec * 1000,
                elapsedSec: 0
              }
            } else if (motion.type === 'modify_speaking_time') {
              const newTime = (motion as any).newTimeSec as number
              newDefaultSpeakingTimeSec = newTime
              newSpeakersList = c.speakerLists!.entries.map((s) =>
                s.status === 'waiting' || s.status === 'ready'
                  ? { ...s, allocatedTimeSec: newTime }
                  : s
              )
            }
          }
        }
      }
    }

    // Add minutes entries for phase changes
    if (newPhase !== c.phase) {
      if (newPhase === 'suspended') {
        newMinutes.push(
          { id: crypto.randomUUID(), timestamp: now, eventType: 'meeting_suspended' as MinutesEventType, description: '暂时休会' },
          { id: crypto.randomUUID(), timestamp: now, eventType: 'phase_changed' as MinutesEventType, description: '进入阶段: 休会' }
        )
      } else if (newPhase === 'closed') {
        newMinutes.push(
          { id: crypto.randomUUID(), timestamp: now, eventType: 'meeting_closed' as MinutesEventType, description: '会议闭幕' },
          { id: crypto.randomUUID(), timestamp: now, eventType: 'phase_changed' as MinutesEventType, description: '进入阶段: 闭幕' }
        )
      } else if (newPhase === 'voting') {
        newMinutes.push(
          { id: crypto.randomUUID(), timestamp: now, eventType: 'phase_changed' as MinutesEventType, description: '进入阶段: 投票表决' }
        )
      } else if (newPhase === 'caucus') {
        newMinutes.push(
          { id: crypto.randomUUID(), timestamp: now, eventType: 'caucus_started' as MinutesEventType, description: '自由磋商开始' },
          { id: crypto.randomUUID(), timestamp: now, eventType: 'phase_changed' as MinutesEventType, description: '进入阶段: 磋商' }
        )
      }
    }

    return {
      ...c,
      phase: newPhase,
      activeSpeaker: newActiveSpeaker,
      activeCaucus: newActiveCaucus,
      defaultSpeakingTimeSec: newDefaultSpeakingTimeSec,
      speakerLists: { ...c.speakerLists!, entries: newSpeakersList },
      votingSessions: c.votingSessions.map((s) =>
        s.id === sessionId ? { ...s, endedAt: now, result } : s
      ),
      motions: newMotions,
      minutes: newMinutes,
      updatedAt: now
    }
  })
}

export function tallyVotes(ballots: VoteBallot[]): { yes: number; no: number; abstain: number } {
  let yes = 0
  let no = 0
  let abstain = 0
  for (const b of ballots) {
    if (b.vote === 'yes') yes++
    else if (b.vote === 'no') no++
    else if (b.vote === 'abstain') abstain++
  }
  return { yes, no, abstain }
}

// ---- 决议 -----------------------------------------------------------------

export function addDocumentName(name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  updateCurrentConference((c) => {
    const filtered = c.documentNames.filter((n) => n !== trimmed)
    return { ...c, documentNames: [trimmed, ...filtered].slice(0, 20) }
  })
}

export function introduceResolution(
  title: string,
  sponsors: string[],
  signatories: string[],
  content: string,
  agendaItemId?: string
): string {
  const id = crypto.randomUUID()
  const resolution: DraftResolution = {
    id,
    title,
    sponsors,
    signatories,
    content,
    agendaItemId,
    createdAt: Date.now()
  }

  updateCurrentConference((c) => ({
    ...c,
    draftResolutions: [...c.draftResolutions, resolution]
  }))

  addMinutesEntry('resolution_introduced', `决议草案提交: ${title}`, { resolutionId: id })
  return id
}

// ---- 会议控制 --------------------------------------------------------------

export function suspendMeeting(): void {
  updateCurrentConference((c) => ({
    ...c,
    phase: 'suspended',
    activeSpeaker: null,
    activeCaucus: null
  }))
  addMinutesEntry('meeting_suspended', '暂时休会')
  addMinutesEntry('phase_changed', '进入阶段: 休会')
}

export function resumeMeeting(): void {
  updateCurrentConference((c) => ({
    ...c,
    phase: 'pending_speakers_list'
  }))
  addMinutesEntry('meeting_resumed', '会议恢复')
  addMinutesEntry('phase_changed', '进入阶段: 等待开启主发言名单')
}

export function closeMeeting(): void {
  updateCurrentConference((c) => ({
    ...c,
    phase: 'closed',
    activeSpeaker: null,
    activeCaucus: null
  }))
  addMinutesEntry('meeting_closed', '会议闭幕')
  addMinutesEntry('phase_changed', '进入阶段: 闭幕')
}

export function setPhase(phase: ConferencePhase): void {
  updateCurrentConference((c) => ({ ...c, phase }))
}

// ---- 会议记录 --------------------------------------------------------------

export function addMinutesEntry(
  eventType: MinutesEventType,
  description: string,
  related?: {
    delegationId?: string
    motionId?: string
    resolutionId?: string
  }
): void {
  const entry: MinutesEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    eventType,
    description,
    ...related
  }
  updateCurrentConference((c) => ({
    ...c,
    minutes: [...c.minutes, entry]
  }))
}

// ---- 投票计算辅助（纯函数，导出复用）---------------------------------------

export function getPresentCount(delegations: Delegation[]): number {
  return delegations.filter((d) => d.attendance === 'present').length
}

export function getSimpleMajorityThreshold(presentCount: number): number {
  return Math.floor(presentCount / 2) + 1
}

export function getTwoThirdsThreshold(presentCount: number): number {
  return Math.ceil((presentCount * 2) / 3)
}

function generateId(): string {
  return crypto.randomUUID()
}
