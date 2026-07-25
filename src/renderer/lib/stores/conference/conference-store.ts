/**
 * conference-store.ts
 * ──────────────────────────────────────────────
 * 模拟大会状态管理。完全遵循 battle-store.ts 的模式：
 * - writable + derived stores
 * - localStorage 持久化（2秒节流）
 * - CRUD + 点名/发言/动议/投票/决议 全操作
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
import { bootstrapStore, saveToStore } from '../store-bridge'

const STORAGE_KEY = 'veto_conferences'
const STORE_DOMAIN = 'conferences'

function generateId(): string {
  return crypto.randomUUID()
}

// ---- 文件持久化（双重写入：localStorage + 文件）--------------------

function loadConferencesFromStorage(): Conference[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const now = Date.now()
    const list: Conference[] = JSON.parse(raw)
    // 清理已过期的计时器状态（避免恢复后显示 00:00 的"正在发言"）
    for (const conf of list) {
      if (conf.activeSpeaker && conf.activeSpeaker.endAt <= now) {
        conf.activeSpeaker = null
      }
      if (conf.activeCaucus && conf.activeCaucus.endAt <= now) {
        conf.activeCaucus = null
      }
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(confs))
    // 双重写入：同步写文件
    saveToStore(STORE_DOMAIN, confs)
  }, 2000)
}

/** 立即保存（绕过防抖），用于离开页面前保存计时器状态 */
export async function saveConferencesNow(): Promise<void> {
  if (typeof localStorage === 'undefined') return
  if (_saveTimer) {
    clearTimeout(_saveTimer)
    _saveTimer = null
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(get(conferences)))
  await saveToStore(STORE_DOMAIN, get(conferences))
}

// ---- 核心 Stores ----

/** 所有大会列表 */
export const conferences = writable<Conference[]>(loadConferencesFromStorage())
conferences.subscribe(saveConferencesToStorage)

/** 启动完成 Promise：文件数据已加载并同步到 localStorage */
export const conferencesReady: Promise<void> = bootstrapStore<Conference[]>(STORE_DOMAIN, []).then(
  (data) => {
    // 清理已过期的计时器状态
    const now = Date.now()
    for (const conf of data) {
      if (conf.activeSpeaker && conf.activeSpeaker.endAt <= now) {
        conf.activeSpeaker = null
      }
      if (conf.activeCaucus && conf.activeCaucus.endAt <= now) {
        conf.activeCaucus = null
      }
    }
    conferences.set(data)
  }
)

/** 当前激活的大会 ID */
export const currentConferenceId = writable<string | null>(null)

/** 当前大会（派生） */
export const currentConference = derived(
  [conferences, currentConferenceId],
  ([$conferences, $id]) => $conferences.find((c) => c.id === $id) ?? null
)

/** 动议编辑草稿（实时同步到 Display） */
export const motionDraft = writable<ConferenceDisplayData['motionDraft'] | null>(null)

/** 问题编辑草稿（实时同步到 Display） */
export const pointDraft = writable<ConferenceDisplayData['pointDraft'] | null>(null)

// ---- 内部辅助 ----

function updateCurrentConference(updater: (conf: Conference) => Conference): void {
  const id = get(currentConferenceId)
  if (!id) return
  conferences.update((list) =>
    list.map((c) => {
      if (c.id !== id) return c
      const updated = updater(c)
      updated.updatedAt = Date.now()
      return updated
    })
  )
}

// ---- CRUD ----

export function createConference(
  name: string,
  venue: string,
  agendaItems: { title: string; description?: string }[],
  delegations: { name: string; shortName?: string }[],
  options?: { defaultSpeakingTimeSec?: number }
): string {
  const id = generateId()

  const delegationList: Delegation[] = delegations.map((d, i) => ({
    id: generateId(),
    name: d.name,
    shortName: d.shortName,
    attendance: 'absent',
    sortOrder: i
  }))

  const agendaList: AgendaItem[] = agendaItems.map((a, i) => ({
    id: generateId(),
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
    speakersList: [],
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

  conferences.update((list) => [...list, conf])
  currentConferenceId.set(id)

  addMinutesEntry('conference_created', `大会创建: ${name}（${venue}）`)
  addMinutesEntry('phase_changed', `进入阶段: 会前准备`)

  return id
}

export function deleteConference(id: string): void {
  conferences.update((list) => list.filter((c) => c.id !== id))
  if (get(currentConferenceId) === id) {
    currentConferenceId.set(null)
  }
}

export function renameConference(id: string, name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  conferences.update((list) =>
    list.map((c) => (c.id === id ? { ...c, name: trimmed, updatedAt: Date.now() } : c))
  )
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

// ---- 点名 ----

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
    const presentCount = c.delegations.filter(
      (d) => d.attendance === 'present'
    ).length
    const simpleMajority = Math.floor(presentCount / 2) + 1
    const twoThirds = Math.ceil((presentCount * 2) / 3)

    addMinutesEntry(
      'roll_call_completed',
      `点名完成: 实到 ${presentCount}/${c.delegations.length}，简单多数 ${simpleMajority} 票，2/3多数 ${twoThirds} 票`
    )
    addMinutesEntry('phase_changed', `进入阶段: 等待开启主发言名单`)

    return { ...c, phase: 'pending_speakers_list' }
  })
}

export function resetRollCall(): void {
  updateCurrentConference((c) => {
    addMinutesEntry(
      'roll_call_reset',
      `重新点名: 所有代表团出席状态已重置`
    )
    addMinutesEntry('phase_changed', `进入阶段: 点名`)

    return {
      ...c,
      phase: 'roll_call',
      delegations: c.delegations.map((d) => ({ ...d, attendance: 'absent' as const }))
    }
  })
}

// ---- 代表团管理 ----

export function addDelegation(name: string): string {
  const id = generateId()
  const conf = get(currentConference)
  const sortOrder = conf?.delegations.length ?? 0

  updateCurrentConference((c) => ({
    ...c,
    delegations: [
      ...c.delegations,
      {
        id,
        name,
        attendance: 'absent',
        sortOrder
      }
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

// ---- 主发言名单 ----

export function openSpeakersList(): void {
  addMinutesEntry('phase_changed', '主发言名单已开启')
}

export function addToSpeakersList(delegationId: string, customTimeSec?: number): string {
  const id = generateId()
  const conf = get(currentConference)
  const timeSec = customTimeSec ?? conf?.defaultSpeakingTimeSec ?? 120

  updateCurrentConference((c) => ({
    ...c,
    speakersList: [
      ...c.speakersList,
      {
        id,
        delegationId,
        addedAt: Date.now(),
        allocatedTimeSec: timeSec,
        status: 'waiting'
      }
    ]
  }))

  const del = conf?.delegations.find((d) => d.id === delegationId)
  addMinutesEntry('speaker_started', `${del?.name ?? delegationId} 加入主发言名单`)
  return id
}

export function removeFromSpeakersList(entryId: string): void {
  updateCurrentConference((c) => ({
    ...c,
    speakersList: c.speakersList.filter((s) => s.id !== entryId)
  }))
}

export function readySpeaker(entryId: string): void {
  updateCurrentConference((c) => ({
    ...c,
    speakersList: c.speakersList.map((s) => (s.id === entryId ? { ...s, status: 'ready' } : s))
  }))

  const conf = get(currentConference)
  const entry = conf?.speakersList.find((s) => s.id === entryId)
  const del = conf?.delegations.find((d) => d.id === entry?.delegationId)
  addMinutesEntry('phase_changed', `${del?.name ?? entry?.delegationId} 准备发言`)
}

export function startSpeaker(entryId: string): void {
  const now = Date.now()
  const allocatedSec = get(currentConference)?.speakersList.find((s) => s.id === entryId)?.allocatedTimeSec ?? 120
  const endAt = now + allocatedSec * 1000
  updateCurrentConference((c) => ({
    ...c,
    speakersList: c.speakersList.map((s) =>
      s.id === entryId ? { ...s, status: 'speaking', remainingTimeSec: undefined } : s
    ),
    activeSpeaker: {
      entryId,
      startedAt: now,
      endAt
    }
  }))

  const entry = get(currentConference)?.speakersList.find((s) => s.id === entryId)
  const conf = get(currentConference)
  const del = conf?.delegations.find((d) => d.id === entry?.delegationId)
  addMinutesEntry(
    'speaker_started',
    `${del?.name ?? entry?.delegationId} 开始发言 (${entry?.allocatedTimeSec ?? 120}秒)`
  )
}

export function pauseSpeaker(): void {
  const now = Date.now()
  updateCurrentConference((c) => {
    if (!c.activeSpeaker) return c
    const remainingBefore = (c.activeSpeaker.endAt - now) / 1000
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
    const oldEndAt = c.activeSpeaker.endAt
    const oldStartedAt = c.activeSpeaker.startedAt
    return {
      ...c,
      activeSpeaker: {
        ...c.activeSpeaker,
        startedAt: now,
        endAt: newEndAt,
        pausedAt: undefined
      },
      // 清理让渡待处理状态：计时器已恢复，让渡解析完成
      yieldPending: null
    }
  })
}

export function endSpeaker(yieldChoice?: YieldChoice): void {
  const conf = get(currentConference)
  const currentSpeaker = conf?.activeSpeaker
  if (!currentSpeaker) return

  const entry = conf?.speakersList.find((s) => s.id === currentSpeaker.entryId)
  const elapsed = (Date.now() - currentSpeaker.startedAt) / 1000
  const remaining = Math.max(0, (entry?.allocatedTimeSec ?? 120) - elapsed)

  updateCurrentConference((c) => ({
    ...c,
    speakersList: c.speakersList.filter((s) => s.id !== currentSpeaker.entryId),
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

/**
 * 处理让渡选择。
 * - chair → 直接结束发言
 * - delegate/question/comment → 暂停计时，进入 yieldPending 状态等待主席解析
 */
export function handleYield(yieldChoice: YieldChoice): void {
  const conf = get(currentConference)
  const currentSpeaker = conf?.activeSpeaker
  if (!currentSpeaker) return

  const entry = conf?.speakersList.find((s) => s.id === currentSpeaker.entryId)
  if (!entry) return

  const elapsed = (Date.now() - currentSpeaker.startedAt) / 1000
  const remaining = Math.max(0, (entry?.allocatedTimeSec ?? 120) - elapsed)
  const del = conf?.delegations.find((d) => d.id === entry?.delegationId)

  // 记录让渡选择到 speaker entry
  updateCurrentConference((c) => ({
    ...c,
    speakersList: c.speakersList.map((s) =>
      s.id === entry.id ? { ...s, yield: yieldChoice } : s
    )
  }))

  const yieldLabels: Record<string, string> = {
    chair: '让渡给主席团',
    delegate: '让渡给另一位代表',
    question: '让渡给提问',
    comment: '让渡给评论'
  }
  const logMsg = `${del?.name ?? entry?.delegationId} ${yieldLabels[yieldChoice.type] ?? yieldChoice.type}（剩余 ${Math.round(remaining)} 秒）`
  addMinutesEntry('yield', logMsg, { delegationId: entry?.delegationId })

  // chair 类型直接结束
  if (yieldChoice.type === 'chair') {
    resolveYieldToChair()
    return
  }

  // delegate / question / comment → 暂停计时器，设置 yieldPending
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

// ---- 让渡解析函数 ----------------------------------------------------------

/** 让渡给主席：移除原发言人，剩余时间作废 */
export function resolveYieldToChair(): void {
  const conf = get(currentConference)
  if (!conf?.yieldPending && !conf?.activeSpeaker) return

  const yp = conf?.yieldPending
  const entryId = yp?.originalEntryId ?? conf?.activeSpeaker?.entryId

  updateCurrentConference((c) => ({
    ...c,
    speakersList: c.speakersList.filter((s) => s.id !== entryId),
    activeSpeaker: null,
    yieldPending: null
  }))

  if (yp) {
    addMinutesEntry('speaker_finished',
      `${yp.originalDelegationName} 让渡给主席团，剩余时间作废`,
      { delegationId: yp.originalDelegationId })
  }
}

/** 让渡给代表：指定目标代表团获得剩余时间（不可再次让渡） */
export function resolveYieldToDelegate(targetDelegationId: string): void {
  const conf = get(currentConference)
  if (!conf?.yieldPending || conf.yieldPending.yieldType !== 'delegate') return

  const yp = conf.yieldPending
  const targetDel = conf.delegations.find((d) => d.id === targetDelegationId)
  if (!targetDel) return

  const newEntry: SpeakerEntry = {
    id: generateId(),
    delegationId: targetDelegationId,
    addedAt: Date.now(),
    allocatedTimeSec: Math.round(yp.remainingSec),
    status: 'ready',
    canYield: false
  }

  updateCurrentConference((c) => ({
    ...c,
    speakersList: [
      newEntry,
      ...c.speakersList.filter((s) => s.id !== yp.originalEntryId)
    ],
    activeSpeaker: null,
    yieldPending: null
  }))

  addMinutesEntry('speaker_finished',
    `${yp.originalDelegationName} 让渡给 ${targetDel.name}（剩余 ${Math.round(yp.remainingSec)} 秒）`,
    { delegationId: yp.originalDelegationId })
}

/** 让渡给提问：指定提问方，原发言人恢复剩余时间回答问题（不可再次让渡） */
export function resolveYieldToQuestion(questionerDelegationId: string): void {
  const conf = get(currentConference)
  if (!conf?.yieldPending || conf.yieldPending.yieldType !== 'question') return

  const yp = conf.yieldPending
  const questionerDel = conf.delegations.find((d) => d.id === questionerDelegationId)
  if (!questionerDel) return

  // 更新 yieldPending 记录提问方信息，同时确保 activeSpeaker.pausedAt 已设置。
  // 计时器保持暂停状态，等待主席在控制台点击"继续计时"后再恢复。
  updateCurrentConference((c) => ({
    ...c,
    activeSpeaker: c.activeSpeaker
      ? { ...c.activeSpeaker, pausedAt: c.activeSpeaker.pausedAt ?? Date.now() }
      : null,
    speakersList: c.speakersList.map((s) =>
      s.id === yp.originalEntryId ? { ...s, canYield: false } : s
    ),
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

/** 让渡给评论：指定评论方获得剩余时间评论（不可再次让渡） */
export function resolveYieldToComment(commenterDelegationId: string): void {
  const conf = get(currentConference)
  if (!conf?.yieldPending || conf.yieldPending.yieldType !== 'comment') return

  const yp = conf.yieldPending
  const commenterDel = conf.delegations.find((d) => d.id === commenterDelegationId)
  if (!commenterDel) return

  const newEntry: SpeakerEntry = {
    id: generateId(),
    delegationId: commenterDelegationId,
    addedAt: Date.now(),
    allocatedTimeSec: Math.round(yp.remainingSec),
    status: 'ready',
    canYield: false
  }

  updateCurrentConference((c) => ({
    ...c,
    speakersList: [
      newEntry,
      ...c.speakersList.filter((s) => s.id !== yp.originalEntryId)
    ],
    activeSpeaker: null,
    yieldPending: null
  }))

  addMinutesEntry('yield',
    `${commenterDel.name} 获得 ${Math.round(yp.remainingSec)} 秒评论时间（来自 ${yp.originalDelegationName} 的让渡）`,
    { delegationId: commenterDel.id })
}

/** 清理让渡待处理状态（取消让渡操作时使用） */
export function cancelYieldPending(): void {
  updateCurrentConference((c) => ({
    ...c,
    yieldPending: null
  }))
}

// ---- 动议 ----

export function proposeMotion(motionData: Omit<Motion, 'id' | 'proposedAt' | 'status'>): string {
  const id = generateId()
  const now = Date.now()

  const motion = {
    ...motionData,
    id,
    proposedAt: now,
    status: 'pending'
  } as Motion

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
    {
      delegationId: motion.proposedByDelegationId,
      motionId: id
    }
  )

  return id
}

// ---- 问题 ----

export function proposePoint(data: {
  type: PointType
  proposedByDelegationId: string
}): string {
  const id = generateId()
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

/** 将最近一条问题标记为已结束，Display 端不再展示 */
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
  addMinutesEntry('motion_approved', `动议通过`, { motionId })

  // 执行动议动作
  executeMotionAction(motion)
}

export function rejectMotion(motionId: string): void {
  updateCurrentConference((c) => ({
    ...c,
    motions: c.motions.map((m) => (m.id === motionId ? { ...m, status: 'rejected' as const } : m))
  }))
  addMinutesEntry('motion_rejected', `动议未通过`, { motionId })
}

/** 忽略最后一个已决动议的结果展示（取消对话框时调用，避免 Display 回退到旧结果） */
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

/** 执行通过后的动议动作 */
function executeMotionAction(motion: Motion): void {
  const conf = get(currentConference)
  if (!conf) return

  switch (motion.type) {
    case 'open_speakers_list':
      updateCurrentConference((c) => {
        const now = Date.now()
        // 如果从投票阶段退出，结束所有进行中的投票会话
        const endedSessions = c.votingSessions.map((s) =>
          !s.endedAt ? { ...s, endedAt: now } : s
        )
        return {
          ...c,
          phase: 'general_debate',
          votingSessions: endedSessions
        }
      })
      addMinutesEntry('phase_changed', `进入阶段: 一般性辩论（主发言名单已开启）`)
      break
    case 'moderated_caucus': {
      // 若当前有发言人且未让渡 → 强制结束发言（剩余时间作废）
      if (conf.activeSpeaker) {
        const speaker = conf.speakersList.find((s) => s.id === conf.activeSpeaker!.entryId)
        if (!speaker?.yield) {
          // 强制结束，不让渡
          updateCurrentConference((c) => ({
            ...c,
            activeSpeaker: null,
            speakersList: c.speakersList.filter((s) => s.id !== conf.activeSpeaker!.entryId)
          }))
          addMinutesEntry('speaker_interrupted', '发言人时间作废（磋商动议通过）')
        }
      }
      // 创建 caucusSetup，动议国默认标首且已加入发言名单
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
      addMinutesEntry('meeting_suspended', `暂时休会`)
      addMinutesEntry('phase_changed', `进入阶段: 休会`)
      break
    case 'close_meeting':
      updateCurrentConference((c) => ({
        ...c,
        phase: 'closed',
        activeSpeaker: null,
        activeCaucus: null
      }))
      addMinutesEntry('meeting_closed', `会议闭幕`)
      addMinutesEntry('phase_changed', `进入阶段: 闭幕`)
      break
    case 'modify_speaking_time':
      updateCurrentConference((c) => ({
        ...c,
        defaultSpeakingTimeSec: (motion as any).newTimeSec,
        speakersList: c.speakersList.map((s) =>
          s.status === 'waiting' || s.status === 'ready'
            ? { ...s, allocatedTimeSec: (motion as any).newTimeSec }
            : s
        )
      }))
      break
    case 'closure_debate':
      // 结束当前发言人（如有）
      if (conf.activeSpeaker) {
        updateCurrentConference((c) => ({
          ...c,
          activeSpeaker: null
        }))
      }
      // 结束当前磋商（如有）
      if (conf.activeCaucus) {
        updateCurrentConference((c) => ({
          ...c,
          activeCaucus: null
        }))
        addMinutesEntry('caucus_ended', '辩论结束，磋商终止')
      }
      // 切换到投票表决阶段
      updateCurrentConference((c) => ({
        ...c,
        phase: 'voting'
      }))
      addMinutesEntry('phase_changed', '进入阶段: 投票表决')
      break
    case 'substantive_vote': {
      // 记录文件名称
      const docName = (motion as any).documentName as string
      if (docName) {
        addDocumentName(docName)
      }
      // 启动唱名投票
      const sessionId = startVotingSession('motion', motion.id, 'two_thirds')
      addMinutesEntry(
        'voting_started',
        `对「${docName || '未命名文件'}」开始实质性投票 (2/3多数)`
      )
      break
    }
  }
}

/** toggleMotionSupport 的内部实现 */
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

  const totalSec = caucusType === 'moderated' ? (motion as any).totalTimeSec : (motion as any).durationSec
  updateCurrentConference((c) => ({
    ...c,
    phase: 'caucus',
    activeCaucus: {
      motionId,
      type: caucusType,
      startedAt: now,
      endAt,
      elapsedSec: 0
    }
  }))

  const label = caucusType === 'moderated' ? `有主持核心磋商` : `自由磋商`
  addMinutesEntry('caucus_started', `${label}开始${topic ? ': ' + topic : ''}`, { motionId })
  addMinutesEntry('phase_changed', `进入阶段: 磋商`)
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

  const totalSec = caucusType === 'moderated' ? (motion as any).totalTimeSec : (motion as any).durationSec
  updateCurrentConference((c) => ({
    ...c,
    phase: 'caucus',
    activeCaucus: {
      motionId,
      type: caucusType,
      startedAt: now,
      endAt,
      elapsedSec: 0
    }
  }))

  const label = caucusType === 'moderated' ? `有主持核心磋商` : `自由磋商`
  addMinutesEntry('caucus_started', `${label}开始${topic ? ': ' + topic : ''}`, { motionId })
  addMinutesEntry('phase_changed', `进入阶段: 磋商`)
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

    // 标尾：插入到动议国之前；标首：追加到末尾
    const ids = c.caucusSetup.speakerDelegationIds
    const newIds =
      c.caucusSetup.proposerPosition === 'last' && proposerId
        ? [...ids.slice(0, -1), delegationId, proposerId]
        : [...ids, delegationId]

    // 人数上限：总时间 / 每人发言时间，不可超过
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

  // 按总时间 / 每人时间计算最大可容纳人数，超出的截断
  const maxSpeakers = Math.max(1, Math.floor(totalSec / perSpeakerSec))
  const trimmedIds = speakerDelegationIds.slice(0, maxSpeakers)

  // 构建 caucusSpeakers 列表
  const caucusSpeakers = trimmedIds.map((delId) => {
    const del = conf.delegations.find((d) => d.id === delId)
    return {
      delegationId: delId,
      delegationName: del?.name ?? delId,
      status: 'waiting' as const,
      allocatedTimeSec: perSpeakerSec
    }
  })

  // 第一个发言人设置为 ready（等待主席手动开始）
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
    activeSpeaker: null // 等待主席手动开始
  }))

  const firstName = caucusSpeakers[0]?.delegationName ?? ''
  addMinutesEntry(
    'caucus_started',
    `有主持核心磋商开始${topic ? ': ' + topic : ''}，首位发言人（就绪）: ${firstName}`,
    { motionId }
  )
  addMinutesEntry('phase_changed', `进入阶段: 磋商`)
}

/** 结束当前磋商发言人，推进到下一位 */
export function advanceCaucusSpeaker(): void {
  const conf = get(currentConference)
  if (!conf?.activeCaucus?.caucusSpeakers) return

  const speakers = conf.activeCaucus.caucusSpeakers
  const currentIdx = conf.activeCaucus.currentSpeakerIndex ?? -1

  // 移除已完成的发言人
  const updatedSpeakers = speakers.filter((_, i) => i !== currentIdx)

  // 检查总剩余时间
  const totalRemaining = (conf.activeCaucus.endAt - Date.now()) / 1000
  const motion = conf.motions.find((m) => m.id === conf.activeCaucus!.motionId) as any
  const perSpeakerSec = motion?.speakingTimePerPersonSec ?? 60
  // 下一位发言人自动移到 currentIdx 位置
  const nextIdx = currentIdx

  if (nextIdx < updatedSpeakers.length && totalRemaining >= perSpeakerSec) {
    // 还有发言人且时间充足 → 进入 ready 状态，等待主席手动开始
    updatedSpeakers[nextIdx] = { ...updatedSpeakers[nextIdx], status: 'ready' }
    const nextName = updatedSpeakers[nextIdx].delegationName

    updateCurrentConference((c) => ({
      ...c,
      activeCaucus: {
        ...c.activeCaucus!,
        caucusSpeakers: updatedSpeakers,
        currentSpeakerIndex: nextIdx
      },
      activeSpeaker: null // 等待主席手动开始
    }))
    addMinutesEntry('speaker_ready', `${nextName} 准备发言（等待主席开始计时）`)
  } else if (nextIdx < updatedSpeakers.length && totalRemaining < perSpeakerSec) {
    // 还有发言人但剩余时间不足一人 → 自动结束磋商
    endCaucus()
  } else if (totalRemaining >= perSpeakerSec) {
    // 名单已耗尽但仍有足够时间 → 回到 caucus_setup 重新设置
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
    // 所有发言人结束且时间到 → 结束磋商
    endCaucus()
  }
}

/** 主席手动开始当前 ready 的磋商发言人计时 */
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

/** 在磋商进行中追加发言人（标首/标尾仅对初始列表生效） */
export function appendCaucusSpeaker(delegationId: string): void {
  const conf = get(currentConference)
  if (!conf?.activeCaucus?.caucusSpeakers) return

  const currentSpeakers = conf.activeCaucus.caucusSpeakers
  if (currentSpeakers.some((s) => s.delegationId === delegationId)) return

  const del = conf.delegations.find((d) => d.id === delegationId)
  const motion = conf.motions.find((m) => m.id === conf.activeCaucus!.motionId) as any
  const perSpeakerSec = motion?.speakingTimePerPersonSec ?? 60

  // 人数上限：剩余时间不足以容纳新增发言人时拒绝添加
  const totalRemaining = (conf.activeCaucus.endAt - Date.now()) / 1000
  const futureCount = currentSpeakers.length + 1
  if (futureCount * perSpeakerSec > totalRemaining) return

  const newSpeaker = {
    delegationId,
    delegationName: del?.name ?? delegationId,
    status: 'waiting' as const,
    allocatedTimeSec: perSpeakerSec
  }

  // 如果当前没有活跃发言人，新发言人设为 ready（等待主席手动开始）
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
      // 不创建 activeSpeaker，等待主席手动开始
    }))
    addMinutesEntry('speaker_ready', `${del?.name ?? delegationId} 准备发言（等待主席开始计时）`)
  }
}

export function pauseCaucus(): void {
  const now = Date.now()
  updateCurrentConference((c) => {
    if (!c.activeCaucus) return c
    const remainingBefore = (c.activeCaucus.endAt - now) / 1000
    return {
      ...c,
      activeCaucus: { ...c.activeCaucus, pausedAt: now }
    }
  })
}

export function resumeCaucus(remainingSec: number): void {
  const now = Date.now()
  const newEndAt = now + remainingSec * 1000
  updateCurrentConference((c) => {
    if (!c.activeCaucus) return c
    const oldEndAt = c.activeCaucus.endAt
    const oldStartedAt = c.activeCaucus.startedAt
    return {
      ...c,
      activeCaucus: {
        ...c.activeCaucus,
        endAt: newEndAt,
        pausedAt: undefined
      }
    }
  })
}

export function endCaucus(): void {
  updateCurrentConference((c) => ({
    ...c,
    phase: 'general_debate',
    activeCaucus: null
  }))
  addMinutesEntry('caucus_ended', `磋商结束`)
  addMinutesEntry('phase_changed', `进入阶段: 一般性辩论`)
}

// ---- 投票 ----

export function startVotingSession(
  targetType: 'motion' | 'resolution',
  targetId: string,
  majorityRule: 'simple_majority' | 'two_thirds'
): string {
  const id = generateId()
  const session: VotingSession = {
    id,
    targetType,
    targetId,
    majorityRule,
    ballots: [],
    startedAt: Date.now()
  }

  updateCurrentConference((c) => ({
    ...c,
    phase: 'voting',
    votingSessions: [...c.votingSessions, session]
  }))

  addMinutesEntry(
    'voting_started',
    `开始投票表决 (${majorityRule === 'simple_majority' ? '简单多数' : '2/3多数'})`
  )
  addMinutesEntry('phase_changed', `进入阶段: 投票表决`)

  return id
}

export function castVote(
  sessionId: string,
  delegationId: string,
  vote: 'yes' | 'no' | 'abstain'
): void {
  updateCurrentConference((c) => ({
    ...c,
    votingSessions: c.votingSessions.map((s) => {
      if (s.id !== sessionId) return s
      const existing = s.ballots.findIndex((b) => b.delegationId === delegationId)
      const newBallot: VoteBallot = { delegationId, vote }
      const ballots =
        existing >= 0
          ? s.ballots.map((b, i) => (i === existing ? newBallot : b))
          : [...s.ballots, newBallot]
      return { ...s, ballots }
    })
  }))
}

export function closeVotingSession(sessionId: string): void {
  updateCurrentConference((c) => {
    const session = c.votingSessions.find((s) => s.id === sessionId)
    if (!session) return c

    const { yes, no, abstain } = tallyVotes(session.ballots)
    const presentCount = c.delegations.filter(
      (d) => d.attendance === 'present'
    ).length
    const threshold =
      session.majorityRule === 'simple_majority'
        ? Math.floor(presentCount / 2) + 1
        : Math.ceil((presentCount * 2) / 3)
    const result: 'passed' | 'failed' = yes >= threshold ? 'passed' : 'failed'

    const now = Date.now()
    const newMinutes = [
      ...c.minutes,
      {
        id: generateId(),
        timestamp: now,
        eventType: 'voting_ended' as MinutesEventType,
        description: `投票结束: Yes ${yes} / No ${no} / Abstain ${abstain} → ${result === 'passed' ? '通过' : '未通过'}`
      }
    ]

    // Update motion status if this voting session is for a motion
    let newMotions = c.motions
    let newPhase = c.phase
    let newActiveSpeaker = c.activeSpeaker
    let newActiveCaucus = c.activeCaucus
    let newDefaultSpeakingTimeSec = c.defaultSpeakingTimeSec
    let newSpeakersList = c.speakersList

    if (session.targetType === 'motion') {
      const motion = c.motions.find((m) => m.id === session.targetId)
      if (motion) {
        // 实质性投票：动议本身已自动通过，投票结果针对的是文件而非动议
        if (motion.type === 'substantive_vote') {
          const docName = (motion as any).documentName as string
          newMinutes.push({
            id: generateId(),
            timestamp: now,
            eventType: 'voting_ended' as MinutesEventType,
            description: `对「${docName}」实质性投票结束: Yes ${yes} / No ${no} / Abstain ${abstain} → ${result === 'passed' ? '通过' : '未通过'}`
          })
          // 不更新 motion 状态，不执行任何动作
          // 投票后结束主发言名单，不可再进行主发言名单
          newSpeakersList = []
          newMinutes.push({
            id: generateId(),
            timestamp: now,
            eventType: 'phase_changed' as MinutesEventType,
            description: '主发言名单已结束'
          })
        } else {
        const motionStatus: 'approved' | 'rejected' = result === 'passed' ? 'approved' : 'rejected'
        newMotions = c.motions.map((m) =>
          m.id === session.targetId ? { ...m, status: motionStatus } : m
        )

        // Execute motion action if passed
        if (result === 'passed') {
          if (motion.type === 'suspend_meeting') {
            newPhase = 'suspended'
            newActiveSpeaker = null
            newActiveCaucus = null
            newMinutes.push(
              {
                id: generateId(),
                timestamp: now,
                eventType: 'meeting_suspended' as MinutesEventType,
                description: '暂时休会'
              },
              {
                id: generateId(),
                timestamp: now,
                eventType: 'phase_changed' as MinutesEventType,
                description: '进入阶段: 休会'
              }
            )
          } else if (motion.type === 'close_meeting') {
            newPhase = 'closed'
            newActiveSpeaker = null
            newActiveCaucus = null
            newMinutes.push(
              {
                id: generateId(),
                timestamp: now,
                eventType: 'meeting_closed' as MinutesEventType,
                description: '会议闭幕'
              },
              {
                id: generateId(),
                timestamp: now,
                eventType: 'phase_changed' as MinutesEventType,
                description: '进入阶段: 闭幕'
              }
            )
          } else if (motion.type === 'closure_debate') {
            newPhase = 'voting'
            newActiveSpeaker = null
            newActiveCaucus = null
            newMinutes.push({
              id: generateId(),
              timestamp: now,
              eventType: 'phase_changed' as MinutesEventType,
              description: '进入阶段: 投票表决'
            })
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
            newMinutes.push(
              {
                id: generateId(),
                timestamp: now,
                eventType: 'caucus_started' as MinutesEventType,
                description: '自由磋商开始'
              },
              {
                id: generateId(),
                timestamp: now,
                eventType: 'phase_changed' as MinutesEventType,
                description: '进入阶段: 磋商'
              }
            )
          } else if (motion.type === 'modify_speaking_time') {
            const newTime = (motion as any).newTimeSec as number
            newDefaultSpeakingTimeSec = newTime
            newSpeakersList = c.speakersList.map((s) =>
              s.status === 'waiting' || s.status === 'ready'
                ? { ...s, allocatedTimeSec: newTime }
                : s
            )
          }
        }
      }
      }
    }

    return {
      ...c,
      phase: newPhase,
      activeSpeaker: newActiveSpeaker,
      activeCaucus: newActiveCaucus,
      defaultSpeakingTimeSec: newDefaultSpeakingTimeSec,
      speakersList: newSpeakersList,
      votingSessions: c.votingSessions.map((s) =>
        s.id === sessionId ? { ...s, endedAt: now, result } : s
      ),
      motions: newMotions,
      minutes: newMinutes,
      updatedAt: now
    }
  })
}

/** 纯函数：统计投票结果 */
export function tallyVotes(ballots: VoteBallot[]): { yes: number; no: number; abstain: number } {
  let yes = 0
  let no = 0
  let abstain = 0
  for (const b of ballots) {
    if (b.vote === 'yes') yes++
    else if (b.vote === 'no') no++
    else abstain++
  }
  return { yes, no, abstain }
}

// ---- 决议 ----

/** 记录文件名称（用于实质性投票的输入提示），去重保留最近 20 条 */
export function addDocumentName(name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  updateCurrentConference((c) => {
    const filtered = c.documentNames.filter((n) => n !== trimmed)
    return {
      ...c,
      documentNames: [trimmed, ...filtered].slice(0, 20)
    }
  })
}

export function introduceResolution(
  title: string,
  sponsors: string[],
  signatories: string[],
  content: string,
  agendaItemId?: string
): string {
  const id = generateId()
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

// ---- 会议控制 ----

export function suspendMeeting(): void {
  updateCurrentConference((c) => ({
    ...c,
    phase: 'suspended',
    activeSpeaker: null,
    activeCaucus: null
  }))
  addMinutesEntry('meeting_suspended', `暂时休会`)
  addMinutesEntry('phase_changed', `进入阶段: 休会`)
}

export function resumeMeeting(): void {
  updateCurrentConference((c) => ({
    ...c,
    phase: 'pending_speakers_list'
  }))
  addMinutesEntry('meeting_resumed', `会议恢复`)
  addMinutesEntry('phase_changed', `进入阶段: 等待开启主发言名单`)
}

export function closeMeeting(): void {
  updateCurrentConference((c) => ({
    ...c,
    phase: 'closed',
    activeSpeaker: null,
    activeCaucus: null
  }))
  addMinutesEntry('meeting_closed', `会议闭幕`)
  addMinutesEntry('phase_changed', `进入阶段: 闭幕`)
}

export function setPhase(phase: ConferencePhase): void {
  updateCurrentConference((c) => ({ ...c, phase }))
}

// ---- 会议记录 ----

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
    id: generateId(),
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

// ---- 投票计算辅助（纯函数，导出复用）----

export function getPresentCount(delegations: Delegation[]): number {
  return delegations.filter(
    (d) => d.attendance === 'present'
  ).length
}

export function getSimpleMajorityThreshold(presentCount: number): number {
  return Math.floor(presentCount / 2) + 1
}

export function getTwoThirdsThreshold(presentCount: number): number {
  return Math.ceil((presentCount * 2) / 3)
}
