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
  Motion,
  DraftResolution,
  VotingSession,
  VoteBallot,
  MinutesEntry,
  MinutesEventType,
  ConferencePhase
} from '$lib/types-conference'
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
export const conferencesReady: Promise<void> = bootstrapStore<Conference[]>(STORE_DOMAIN, []).then((data) => {
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
})

/** 当前激活的大会 ID */
export const currentConferenceId = writable<string | null>(null)

/** 当前大会（派生） */
export const currentConference = derived(
  [conferences, currentConferenceId],
  ([$conferences, $id]) => $conferences.find((c) => c.id === $id) ?? null
)

/** 动议编辑草稿（实时同步到 Display） */
export const motionDraft = writable<ConferenceDisplayData['motionDraft'] | null>(null)

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
  delegations: { name: string; shortName?: string; vetoPower: boolean; color: string }[],
  options?: { defaultSpeakingTimeSec?: number }
): string {
  const id = generateId()

  const delegationList: Delegation[] = delegations.map((d, i) => ({
    id: generateId(),
    name: d.name,
    shortName: d.shortName,
    color: d.color,
    vetoPower: d.vetoPower,
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
    draftResolutions: [],
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
  attendance: 'present' | 'absent' | 'present_and_voting'
): void {
  updateCurrentConference((c) => ({
    ...c,
    delegations: c.delegations.map((d) =>
      d.id === delegationId ? { ...d, attendance } : d
    )
  }))
}

export function completeRollCall(): void {
  updateCurrentConference((c) => {
    const presentCount = c.delegations.filter(
      (d) => d.attendance === 'present' || d.attendance === 'present_and_voting'
    ).length
    const simpleMajority = Math.floor(presentCount / 2) + 1
    const twoThirds = Math.ceil(presentCount * 2 / 3)

    addMinutesEntry(
      'roll_call_completed',
      `点名完成: 实到 ${presentCount}/${c.delegations.length}，简单多数 ${simpleMajority} 票，2/3多数 ${twoThirds} 票`
    )
    addMinutesEntry('phase_changed', `进入阶段: 一般性辩论`)

    return { ...c, phase: 'general_debate' }
  })
}

// ---- 代表团管理 ----

export function addDelegation(name: string, color: string, vetoPower: boolean): string {
  const id = generateId()
  const conf = get(currentConference)
  const sortOrder = (conf?.delegations.length ?? 0)

  updateCurrentConference((c) => ({
    ...c,
    delegations: [
      ...c.delegations,
      {
        id,
        name,
        color,
        vetoPower,
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
    speakersList: c.speakersList.map((s) =>
      s.id === entryId ? { ...s, status: 'ready' } : s
    )
  }))

  const conf = get(currentConference)
  const entry = conf?.speakersList.find((s) => s.id === entryId)
  const del = conf?.delegations.find((d) => d.id === entry?.delegationId)
  addMinutesEntry('phase_changed', `${del?.name ?? entry?.delegationId} 准备发言`)
}

export function startSpeaker(entryId: string): void {
  const now = Date.now()
  updateCurrentConference((c) => ({
    ...c,
    speakersList: c.speakersList.map((s) =>
      s.id === entryId
        ? { ...s, status: 'speaking', remainingTimeSec: undefined }
        : s
    ),
    activeSpeaker: {
      entryId,
      startedAt: now,
      endAt: now + (c.speakersList.find((s) => s.id === entryId)?.allocatedTimeSec ?? 120) * 1000
    }
  }))

  const entry = get(currentConference)?.speakersList.find((s) => s.id === entryId)
  const conf = get(currentConference)
  const del = conf?.delegations.find((d) => d.id === entry?.delegationId)
  addMinutesEntry('speaker_started', `${del?.name ?? entry?.delegationId} 开始发言 (${entry?.allocatedTimeSec ?? 120}秒)`)
}

export function pauseSpeaker(): void {
  updateCurrentConference((c) => {
    if (!c.activeSpeaker) return c
    return {
      ...c,
      activeSpeaker: { ...c.activeSpeaker, pausedAt: Date.now() }
    }
  })
}

export function resumeSpeaker(remainingSec: number): void {
  const now = Date.now()
  updateCurrentConference((c) => {
    if (!c.activeSpeaker) return c
    return {
      ...c,
      activeSpeaker: {
        ...c.activeSpeaker,
        startedAt: now,
        endAt: now + remainingSec * 1000,
        pausedAt: undefined
      }
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
    activeSpeaker: null
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

export function handleYield(yieldChoice: YieldChoice): void {
  endSpeaker(yieldChoice)
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
  const motionLabel = motion.type === 'moderated_caucus'
    ? `有主持核心磋商: ${(motion as any).topic}`
    : motion.type
  addMinutesEntry('motion_proposed', `${del?.name ?? motion.proposedByDelegationId} 提出动议: ${motionLabel}`, {
    delegationId: motion.proposedByDelegationId,
    motionId: id
  })

  return id
}

export function approveMotion(motionId: string): void {
  const conf = get(currentConference)
  const motion = conf?.motions.find((m) => m.id === motionId)
  if (!motion) return

  updateCurrentConference((c) => ({
    ...c,
    motions: c.motions.map((m) =>
      m.id === motionId ? { ...m, status: 'approved' as const } : m
    )
  }))
  addMinutesEntry('motion_approved', `动议通过`, { motionId })

  // 执行动议动作
  executeMotionAction(motion)
}

export function rejectMotion(motionId: string): void {
  updateCurrentConference((c) => ({
    ...c,
    motions: c.motions.map((m) =>
      m.id === motionId ? { ...m, status: 'rejected' as const } : m
    )
  }))
  addMinutesEntry('motion_rejected', `动议未通过`, { motionId })
}

/** 执行通过后的动议动作 */
function executeMotionAction(motion: Motion): void {
  const conf = get(currentConference)
  if (!conf) return

  switch (motion.type) {
    case 'moderated_caucus': {
      // 若当前有发言人且未让渡 → 强制结束发言（剩余时间作废）
      if (conf.activeSpeaker) {
        const speaker = conf.speakersList.find((s) => s.id === conf.activeSpeaker!.entryId)
        if (!speaker?.yield) {
          // 强制结束，不让渡
          updateCurrentConference((c) => ({
            ...c,
            activeSpeaker: null,
            speakersList: c.speakersList.filter(
              (s) => s.id !== conf.activeSpeaker!.entryId
            )
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
        defaultSpeakingTimeSec: (motion as any).newTimeSec
      }))
      break
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

// ---- 磋商发言名单设置 ----

export function setCaucusProposerPosition(position: 'first' | 'last'): void {
  updateCurrentConference((c) => {
    if (!c.caucusSetup) return c
    const motion = c.motions.find((m) => m.id === c.caucusSetup!.motionId)
    const proposerId = (motion as any)?.proposedByDelegationId as string | undefined
    if (!proposerId) return { ...c, caucusSetup: { ...c.caucusSetup, proposerPosition: position } }

    const ids = c.caucusSetup.speakerDelegationIds.filter((id) => id !== proposerId)
    const reordered = position === 'first'
      ? [proposerId, ...ids]
      : [...ids, proposerId]

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
    const newIds = c.caucusSetup.proposerPosition === 'last' && proposerId
      ? [...ids.slice(0, -1), delegationId, proposerId]
      : [...ids, delegationId]

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
        speakerDelegationIds: c.caucusSetup.speakerDelegationIds.filter(
          (id) => id !== delegationId
        )
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
  const perSpeakerSec = (motion as any).speakingTimePerPersonSec as number ?? 60
  const totalSec = remainingSec ?? (motion as any).totalTimeSec as number
  const topic = (motion as any).topic

  // 构建 caucusSpeakers 列表
  const caucusSpeakers = speakerDelegationIds.map((delId) => {
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
    activeSpeaker: null  // 等待主席手动开始
  }))

  const firstName = caucusSpeakers[0]?.delegationName ?? ''
  addMinutesEntry('caucus_started', `有主持核心磋商开始${topic ? ': ' + topic : ''}，首位发言人（就绪）: ${firstName}`, { motionId })
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
  // 下一位发言人自动移到 currentIdx 位置
  const nextIdx = currentIdx

  if (nextIdx < updatedSpeakers.length) {
    // 还有发言人 → 进入 ready 状态，等待主席手动开始
    updatedSpeakers[nextIdx] = { ...updatedSpeakers[nextIdx], status: 'ready' }
    const nextName = updatedSpeakers[nextIdx].delegationName

    updateCurrentConference((c) => ({
      ...c,
      activeCaucus: {
        ...c.activeCaucus!,
        caucusSpeakers: updatedSpeakers,
        currentSpeakerIndex: nextIdx
      },
      activeSpeaker: null  // 等待主席手动开始
    }))
    addMinutesEntry('speaker_ready', `${nextName} 准备发言（等待主席开始计时）`)
  } else if (totalRemaining > 5) {
    // 名单已耗尽但仍有剩余时间 → 回到 caucus_setup 重新设置
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
  updateCurrentConference((c) => {
    if (!c.activeCaucus) return c
    return {
      ...c,
      activeCaucus: { ...c.activeCaucus, pausedAt: Date.now() }
    }
  })
}

export function resumeCaucus(remainingSec: number): void {
  const now = Date.now()
  updateCurrentConference((c) => {
    if (!c.activeCaucus) return c
    return {
      ...c,
      activeCaucus: {
        ...c.activeCaucus,
        endAt: now + remainingSec * 1000,
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

  addMinutesEntry('voting_started', `开始投票表决 (${majorityRule === 'simple_majority' ? '简单多数' : '2/3多数'})`)
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
      (d) => d.attendance === 'present' || d.attendance === 'present_and_voting'
    ).length
    const threshold =
      session.majorityRule === 'simple_majority'
        ? Math.floor(presentCount / 2) + 1
        : Math.ceil(presentCount * 2 / 3)
    const result: 'passed' | 'failed' = yes >= threshold ? 'passed' : 'failed'

    const now = Date.now()
    const newMinutes = [...c.minutes, {
      id: generateId(),
      timestamp: now,
      eventType: 'voting_ended' as MinutesEventType,
      description: `投票结束: Yes ${yes} / No ${no} / Abstain ${abstain} → ${result === 'passed' ? '通过' : '未通过'}`
    }]

    // Update motion status if this voting session is for a motion
    let newMotions = c.motions
    let newPhase = c.phase
    let newActiveSpeaker = c.activeSpeaker
    let newActiveCaucus = c.activeCaucus

    if (session.targetType === 'motion') {
      const motion = c.motions.find((m) => m.id === session.targetId)
      if (motion) {
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
          }
        }
      }
    }

    return {
      ...c,
      phase: newPhase,
      activeSpeaker: newActiveSpeaker,
      activeCaucus: newActiveCaucus,
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
export function tallyVotes(
  ballots: VoteBallot[]
): { yes: number; no: number; abstain: number } {
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
    phase: 'general_debate'
  }))
  addMinutesEntry('meeting_resumed', `会议恢复`)
  addMinutesEntry('phase_changed', `进入阶段: 一般性辩论`)
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
    (d) => d.attendance === 'present' || d.attendance === 'present_and_voting'
  ).length
}

export function getSimpleMajorityThreshold(presentCount: number): number {
  return Math.floor(presentCount / 2) + 1
}

export function getTwoThirdsThreshold(presentCount: number): number {
  return Math.ceil(presentCount * 2 / 3)
}
