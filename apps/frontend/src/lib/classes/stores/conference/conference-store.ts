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
  YieldChoice,
  Motion,
  VoteBallot,
  ConferenceActionType,
  ConferencePhase
} from '$lib/classes/types/conference'
import type {
  PointType,
  Attendance,
  ProposerPosition,
  MajorityRule,
  VoteTargetType
} from '$lib/classes/types/conference'
import type { Seat, SeatGroup } from '$lib/classes/types/delegate'
import { ConferenceEngine } from '$lib/classes/services/engine/ConferenceEngine.svelte'
import { tallyVotesEngine } from '$lib/classes/services/engine/conference-engine'
import { getDisplayBridge, buildDisplayData } from '$lib/classes/clients/conference-display-client'
import { bootstrapStore, saveToStore } from '../../helpers/store-bridge'

const STORAGE_KEY = 'veto_conferences'
const STORE_DOMAIN = 'conferences'

// ---- 引擎注册表 ----------------------------------------------------------

/** 所有会议引擎实例（按 ID 索引） */
const _engines = new Map<string, ConferenceEngine>()

/** 获取引擎 */
function getEngine(id: string): ConferenceEngine | undefined {
  return _engines.get(id)
}

/** 获取当前会议引擎（便捷方法） */
function getCurrentEngine(): ConferenceEngine | undefined {
  const id = get(currentConferenceId)
  if (!id) return undefined
  return _engines.get(id)
}

/** 注册引擎 */
function registerEngine(engine: ConferenceEngine): void {
  _engines.set(engine.id, engine)
}

/** 注销引擎 */
function unregisterEngine(id: string): void {
  _engines.delete(id)
}

/** 将引擎当前状态同步到 conferences writable store（用于持久化） */
function syncEngine(engine: ConferenceEngine): void {
  conferences.update((list) => list.map((c) => (c.id === engine.id ? engine.toJSON() : c)))
}

// ---- 文件持久化（双重写入：localStorage + 文件）--------------------------

function loadConferencesFromStorage(): Conference[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list: Conference[] = JSON.parse(raw)
    // 清理过期状态 & 注册引擎（由 ConferenceEngine.fromJSON() 统一处理）
    for (const conf of list) {
      // 过期清理统一由 ConferenceEngine.fromJSON() 处理
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
  const json = JSON.stringify(get(conferences))
  localStorage.setItem(STORAGE_KEY, json)
  // 通过 JSON round-trip 确保纯 JSON 对象（剥离 Svelte $state 代理等）
  await saveToStore(STORE_DOMAIN, JSON.parse(json))
}

// ---- 核心 Stores ----------------------------------------------------------

/** 所有大会列表（Conference JSON 格式，向后兼容） */
export const conferences = writable<Conference[]>(loadConferencesFromStorage())
conferences.subscribe(saveConferencesToStorage)

/** 启动完成 Promise：文件数据已加载并同步到 localStorage */
export const conferencesReady: Promise<void> = bootstrapStore<Conference[]>(STORE_DOMAIN, []).then(
  (data) => {
    for (const conf of data) {
      // 过期清理统一由 ConferenceEngine.fromJSON() 处理
      const engine = ConferenceEngine.fromJSON(conf)
      registerEngine(engine)
    }
    conferences.set(data)
  }
)

/** 当前激活的大会 ID */
export const currentConferenceId = writable<string | null>(null)

const LAST_OPENED_KEY = 'veto_last_opened_conference'

/** 最近一次打开的大会 ID（用于首页"继续上次"横幅，独立持久化，退出会议不清空） */
export const lastOpenedConferenceId = writable<string | null>(
  typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_OPENED_KEY) : null
)
lastOpenedConferenceId.subscribe((id) => {
  if (typeof localStorage === 'undefined') return
  if (id) localStorage.setItem(LAST_OPENED_KEY, id)
  else localStorage.removeItem(LAST_OPENED_KEY)
})

/** 当前大会（派生，向后兼容） */
export const currentConference = derived(
  [conferences, currentConferenceId],
  ([$conferences, $id]) => $conferences.find((c) => c.id === $id) ?? null
)

/** 当前大会引擎（派生，供需要直接访问引擎的组件使用） */
export const currentEngine = derived([conferences, currentConferenceId], ([$conferences, $id]) => {
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
})

/** 动议编辑草稿（实时同步到 Display） */
export const motionDraft = writable<ConferenceDisplayData['motionDraft'] | null>(null)

/** 问题编辑草稿（实时同步到 Display） */
export const pointDraft = writable<ConferenceDisplayData['pointDraft'] | null>(null)

// ---- CRUD -----------------------------------------------------------------

export function createConference(
  name: string,
  venue: string,
  agendaItems: { title: string; description?: string }[],
  delegations: { name: string; shortName?: string; vetoPower?: boolean }[],
  options?: {
    defaultSpeakingTimeSec?: number
    eventId?: string
    seatGroups?: SeatGroup[]
    seats?: Seat[]
  }
): string {
  const id = crypto.randomUUID()

  const delegationList: Delegation[] = delegations.map((d, i) => ({
    id: crypto.randomUUID(),
    name: d.name,
    shortName: d.shortName,
    attendance: 'absent' as const,
    vetoPower: d.vetoPower ?? true,
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
    eventId: options?.eventId,
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
    activeSpeaker: null,
    seatGroups: options?.seatGroups ?? [],
    seats: options?.seats ?? [],
    news: [],
    situationUpdates: []
  }

  // 创建并注册引擎
  const engine = new ConferenceEngine(conf)
  engine.addConferenceEntry('conference_created', `大会创建: ${name}（${venue}）`)
  engine.addConferenceEntry('phase_changed', '进入阶段: 会前准备')
  registerEngine(engine)

  conferences.update((list) => [...list, engine.toJSON()])
  currentConferenceId.set(id)
  lastOpenedConferenceId.set(id)
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

export function bindTimeline(conferenceId: string, timelineId: string | null): void {
  const engine = getEngine(conferenceId)
  if (engine) {
    engine.timelineId = timelineId
    syncEngine(engine)
  }
}

export function loadConference(id: string): void {
  const conf = getConferenceById(id)
  if (conf) {
    currentConferenceId.set(id)
    lastOpenedConferenceId.set(id)
  }
}

export function unloadConference(): void {
  currentConferenceId.set(null)
}

export function getConferenceById(id: string): Conference | null {
  return get(conferences).find((c) => c.id === id) ?? null
}

// ---- 点名 -----------------------------------------------------------------

/** 更改代表团出席状态（含会议记录 + Display 通知，动议 & 直接管理统一入口） */
export function changeDelegationAttendance(
  delegationId: string,
  newAttendance: Attendance,
  opts?: { silent?: boolean }
): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.changeDelegationAttendance(delegationId, newAttendance, opts)
  syncEngine(engine)
}

/** 设置代表团的投票权（vetoPower） */
export function setDelegationVetoPower(delegationId: string, vetoPower: boolean): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.updateDelegation(delegationId, { vetoPower })
  syncEngine(engine)
}

export function completeRollCall(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.completeRollCall()
  syncEngine(engine)
}

export function resetRollCall(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.resetRollCall()
  syncEngine(engine)
}

// ---- 代表团管理 ------------------------------------------------------------

export function addDelegation(name: string, shortName?: string): string {
  const engine = getCurrentEngine()
  if (!engine) return ''
  const id = engine.addDelegation(name, shortName)
  syncEngine(engine)
  return id
}

export function removeDelegation(id: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.removeDelegation(id)
  syncEngine(engine)
}

export function updateDelegation(id: string, updates: Partial<Delegation>): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.updateDelegation(id, updates)
  syncEngine(engine)
}

// ---- 主发言名单 ------------------------------------------------------------

export function openSpeakersList(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.addConferenceEntry('phase_changed', '主发言名单已开启')
  syncEngine(engine)
}

export function addToSpeakersList(delegationId: string, customTimeSec?: number): string {
  const engine = getCurrentEngine()
  if (!engine) return ''
  const id = engine.addToSpeakersList(delegationId, customTimeSec)
  syncEngine(engine)
  return id
}

export function removeFromSpeakersList(entryId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.removeFromSpeakersList(entryId)
  syncEngine(engine)
}

export function readySpeaker(entryId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.readySpeakerEntry(entryId)
  syncEngine(engine)
}

export function startSpeaker(entryId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.startSpeakingEntry(entryId)
  syncEngine(engine)
}

export function pauseSpeaker(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.pauseSpeaking()
  syncEngine(engine)
}

export function resumeSpeaker(_remainingSec?: number): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.resumeSpeaking()
  syncEngine(engine)
}

export function endSpeaker(yieldChoice?: YieldChoice): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.endSpeaking(yieldChoice)
  syncEngine(engine)
}

// ---- 让渡 -----------------------------------------------------------------

export function handleYield(yieldChoice: YieldChoice): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.handleYield(yieldChoice)
  syncEngine(engine)
}

export function resolveYieldToChair(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.resolveYieldToChair()
  syncEngine(engine)
}

export function resolveYieldToDelegate(targetDelegationId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.resolveYieldToDelegate(targetDelegationId)
  syncEngine(engine)
}

export function resolveYieldToQuestion(questionerDelegationId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.resolveYieldToQuestion(questionerDelegationId)
  syncEngine(engine)
}

export function resolveYieldToComment(commenterDelegationId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.resolveYieldToComment(commenterDelegationId)
  syncEngine(engine)
}

export function cancelYieldPending(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.cancelYieldPending()
  syncEngine(engine)
}

// ---- 动议 -----------------------------------------------------------------

export function proposeMotion(motionData: Omit<Motion, 'id' | 'proposedAt' | 'status'>): string {
  const engine = getCurrentEngine()
  if (!engine) return ''
  const id = engine.proposeMotion(motionData)
  syncEngine(engine)

  return id
}

export function proposePoint(data: { type: PointType; proposedByDelegationId: string }): string {
  const engine = getCurrentEngine()
  if (!engine) return ''
  // Engine 方法名是 raisePoint
  const id = engine.raisePoint(data.type, data.proposedByDelegationId)
  syncEngine(engine)
  // 推送问题到 Display
  getDisplayBridge().sendUpdate(buildDisplayData(engine))
  return id
}

export function dismissLatestPoint(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.dismissLatestPoint()
  syncEngine(engine)
  getDisplayBridge().sendUpdate(buildDisplayData(engine))
}

export function approveMotion(motionId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.approveMotion(motionId)
  syncEngine(engine)
  getDisplayBridge().sendUpdate(buildDisplayData(engine))
}

export function rejectMotion(motionId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.rejectMotion(motionId)
  syncEngine(engine)
  getDisplayBridge().sendUpdate(buildDisplayData(engine))
}

export function dismissLastResolvedMotion(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.dismissLastResolvedMotion()
  syncEngine(engine)
}

export function startCaucus(motionId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.startCaucus(motionId)
  syncEngine(engine)
}

export function setCaucusProposerPosition(position: ProposerPosition): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.setCaucusProposerPosition(position)
  syncEngine(engine)
}

export function addToCaucusSpeakers(delegationId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.addToCaucusSpeakersSetup(delegationId)
  syncEngine(engine)
}

export function removeFromCaucusSpeakers(delegationId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.removeFromCaucusSpeakersSetup(delegationId)
  syncEngine(engine)
}

export function startCaucusWithSetup(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.startCaucusWithSetup()
  syncEngine(engine)
}

export function advanceCaucusSpeaker(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.advanceCaucusSpeaker()
  syncEngine(engine)
}

export function startCaucusSpeaker(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.startCaucusSpeakerEntry()
  syncEngine(engine)
}

export function appendCaucusSpeaker(delegationId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.appendCaucusSpeaker(delegationId)
  syncEngine(engine)
}

export function cancelCaucusSpeaker(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.cancelCaucusSpeaker()
  syncEngine(engine)
}

export function pauseCaucus(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.pauseCaucus()
  syncEngine(engine)
}

export function resumeCaucus(_remainingSec?: number): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.resumeCaucus()
  syncEngine(engine)
}

export function endCaucus(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.endCaucus()
  syncEngine(engine)
}

// ---- 投票 -----------------------------------------------------------------

export function startVotingSession(
  targetType: VoteTargetType,
  targetId: string,
  majorityRule: MajorityRule
): string {
  const engine = getCurrentEngine()
  if (!engine) return ''
  const id = engine.startVotingSession(targetType, targetId, majorityRule)
  syncEngine(engine)
  return id
}

export function castVote(
  sessionId: string,
  delegationId: string,
  vote: 'yes' | 'no' | 'abstain' | 'skip'
): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.castVote(sessionId, delegationId, vote)
  syncEngine(engine)
}

export function closeVotingSession(sessionId: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.closeVotingSession(sessionId)
  syncEngine(engine)
}

export function tallyVotes(ballots: VoteBallot[]): { yes: number; no: number; abstain: number } {
  return tallyVotesEngine(ballots)
}

// ---- 决议 -----------------------------------------------------------------

export function addDocumentName(name: string): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.addDocumentName(name)
  syncEngine(engine)
}

export function introduceResolution(
  title: string,
  sponsors: string[],
  signatories: string[],
  content: string,
  agendaItemId?: string
): string {
  const engine = getCurrentEngine()
  if (!engine) return ''
  const id = engine.introduceResolution(title, sponsors, signatories, content, agendaItemId)
  syncEngine(engine)
  return id
}

// ---- 会议控制 --------------------------------------------------------------

export function suspendMeeting(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.suspendMeeting()
  syncEngine(engine)
}

export function resumeMeeting(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.resumeMeeting()
  syncEngine(engine)
}

export function closeMeeting(): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.closeMeeting()
  syncEngine(engine)
}

export function setPhase(phase: ConferencePhase): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.setPhase(phase)
  syncEngine(engine)
}

// ---- 会议记录 --------------------------------------------------------------

export function addConferenceEntry(
  actionType: ConferenceActionType,
  description: string,
  related?: {
    delegationId?: string
    motionId?: string
    resolutionId?: string
  }
): void {
  const engine = getCurrentEngine()
  if (!engine) return
  engine.addConferenceEntry(actionType, description, related as any)
  syncEngine(engine)
}

// ---- 投票计算辅助（纯函数，导出复用）---------------------------------------

export function getPresentCount(delegations: Delegation[]): number {
  return delegations.filter((d) => d.attendance === 'present').length
}

/** 拥有投票权的出席代表人数（排除观察员） */
export function getVotingCount(delegations: Delegation[]): number {
  return delegations.filter((d) => d.attendance === 'present' && d.vetoPower !== false).length
}

export function getSimpleMajorityThreshold(presentCount: number): number {
  return Math.floor(presentCount / 2) + 1
}

export function getTwoThirdsThreshold(presentCount: number): number {
  return Math.ceil((presentCount * 2) / 3)
}
