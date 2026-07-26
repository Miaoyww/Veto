/**
 * ConferenceEngine.svelte.ts
 * ──────────────────────────────────────────────
 * 模拟大会引擎：ConferenceEngine + SpeakerList 类。
 *
 * 使用 Svelte 5 $state rune 实现响应式，组件可直接访问引擎属性。
 * 序列化/反序列化保持纯 JSON 兼容（Conference 接口）。
 */

import type {
  Conference,
  ConferencePhase,
  Delegation,
  AgendaItem,
  SpeakerEntry,
  SpeakerListData,
  YieldChoice,
  YieldPendingState,
  Motion,
  DraftResolution,
  VotingSession,
  VoteBallot,
  MinutesEntry,
  MinutesEventType,
  Point,
  PointType
} from '$lib/types-conference'
import { POINT_LABELS } from '$lib/types-conference'
import { getDisplayBridge, buildDisplayData } from '$lib/services/conference-display-bridge'
import {
  Timer,
  calculateMajorityThresholds,
  determinePassFail,
  tallyVotesEngine,
  canTransition,
  calcMaxSpeakers
} from './conference-engine'

// ---- 工具函数 ----------------------------------------------------------

function generateId(): string {
  return crypto.randomUUID()
}

// ====================================================================
//  SpeakerList —— 发言名单
// ====================================================================

export class SpeakerList {
  id: string
  name: string
  entries: SpeakerEntry[] = $state([])

  constructor(id: string, name: string, entries?: SpeakerEntry[]) {
    this.id = id
    this.name = name
    if (entries) this.entries = entries
  }

  // ── 查询 getters ──

  get current(): SpeakerEntry | null {
    return this.entries.find((s) => s.status === 'speaking') ?? null
  }

  /** 下一个发言人：当前发言人的下一位（caucus）/ 第一个 waiting（debate） */
  get next(): SpeakerEntry | null {
    const currentIdx = this.entries.findIndex((s) => s.status === 'speaking')
    if (currentIdx >= 0 && currentIdx + 1 < this.entries.length) {
      return this.entries[currentIdx + 1]
    }
    return this.waiting[0] ?? null
  }

  get ready(): SpeakerEntry | null {
    return this.entries.find((s) => s.status === 'ready') ?? null
  }

  get waiting(): SpeakerEntry[] {
    return this.entries.filter((s) => s.status === 'waiting')
  }

  get isExhausted(): boolean {
    return this.entries.length > 0 && this.entries.every((s) => s.status === 'finished')
  }

  // ── 操作 ──

  /** 添加代表团到发言名单，返回 entryId */
  add(delegation: Delegation, allocatedTimeSec?: number): string {
    const id = generateId()
    const entry: SpeakerEntry = {
      id,
      delegationId: delegation.id,
      addedAt: Date.now(),
      allocatedTimeSec: allocatedTimeSec ?? 120,
      status: 'waiting',
      delegation
    }
    this.entries = [...this.entries, entry]
    return id
  }

  remove(entryId: string): void {
    this.entries = this.entries.filter((s) => s.id !== entryId)
  }

  readySpeaker(entryId: string): void {
    this.entries = this.entries.map((s) =>
      s.id === entryId ? { ...s, status: 'ready' } : s
    )
  }

  startSpeaking(entryId: string): SpeakerEntry | null {
    let found: SpeakerEntry | null = null
    this.entries = this.entries.map((s) => {
      if (s.id === entryId) {
        found = { ...s, status: 'speaking', remainingTimeSec: undefined }
        return found
      }
      return s
    })
    return found
  }

  finishCurrent(): SpeakerEntry | null {
    const current = this.current
    if (!current) return null
    this.entries = this.entries.filter((s) => s.id !== current.id)
    return current
  }

  pauseCurrent(): void {
    // 标记当前发言人为 interrupted（状态由 ConferenceEngine 管理）
  }

  /** 将当前发言人标记为 interrupted */
  interruptCurrent(): SpeakerEntry | null {
    const current = this.current
    if (!current) return null
    let interrupted: SpeakerEntry | null = null
    this.entries = this.entries.map((s) => {
      if (s.id === current.id) {
        interrupted = { ...s, status: 'interrupted' }
        return interrupted
      }
      return s
    })
    return interrupted
  }

  // ── 序列化 ──

  toJSON(): SpeakerListData {
    return {
      id: this.id,
      name: this.name,
      entries: this.entries.map((s) => {
        // 剥离 runtime delegation 引用，保持 JSON 兼容
        const { delegation, ...rest } = s
        return rest
      })
    }
  }

  static fromJSON(
    json: SpeakerListData,
    delegations: Delegation[]
  ): SpeakerList {
    const entries: SpeakerEntry[] = json.entries.map((e) => {
      const del = delegations.find((d) => d.id === e.delegationId)
      return { ...e, delegation: del }
    })
    return new SpeakerList(json.id, json.name, entries)
  }
}

// ====================================================================
//  ConferenceEngine —— 会议引擎
// ====================================================================

export class ConferenceEngine {
  // ── 基础信息 ──
  id: string
  name: string = $state('')
  venue: string = $state('')
  createdAt: number = 0
  updatedAt: number = $state(0)

  // ── 配置 ──
  defaultSpeakingTimeSec: number = $state(120)

  // ── 代表团 ──
  delegations: Delegation[] = $state([])

  // ── 议题 ──
  agenda: AgendaItem[] = $state([])

  // ── 发言名单 ──
  speakerList: SpeakerList = new SpeakerList('main', '主发言名单')

  // ── 运行时状态 ──
  phase: ConferencePhase = $state('preamble')
  activeSpeaker: Conference['activeSpeaker'] = $state(null)
  activeCaucus: Conference['activeCaucus'] = $state(null)
  yieldPending: YieldPendingState | null = $state(null)
  caucusSetup: Conference['caucusSetup'] = $state(null)
  /** 主发言名单是否曾被填充过（用于判断清空后是否需要重新动议） */
  speakersListHasBeenPopulated: boolean = $state(false)

  // ── 会议记录 ──
  motions: Motion[] = $state([])
  dismissedResolvedMotionIds: string[] = $state([])
  points: Point[] = $state([])
  dismissedPointIds: string[] = $state([])
  draftResolutions: DraftResolution[] = $state([])
  documentNames: string[] = $state([])
  votingSessions: VotingSession[] = $state([])
  minutes: MinutesEntry[] = $state([])

  // ── 计时器 ──
  timers: Map<string, Timer> = new Map()

  constructor(data?: Partial<Conference>) {
    this.id = data?.id ?? generateId()
    if (data) {
      this.restoreFromConference(data)
    }
  }

  /** 从 Conference 数据还原状态（含 delegation 引用还原） */
  private restoreFromConference(data: Partial<Conference>): void {
    if (data.name != null) this.name = data.name
    if (data.venue != null) this.venue = data.venue
    if (data.createdAt != null) this.createdAt = data.createdAt
    if (data.updatedAt != null) this.updatedAt = data.updatedAt
    if (data.defaultSpeakingTimeSec != null) this.defaultSpeakingTimeSec = data.defaultSpeakingTimeSec
    if (data.delegations != null) {
      // 向后兼容：旧数据可能没有 vetoPower 字段，默认为 true
      this.delegations = data.delegations.map((d) => ({
        ...d,
        vetoPower: d.vetoPower ?? true
      }))
    }
    if (data.agenda != null) this.agenda = data.agenda
    if (data.phase != null) this.phase = data.phase
    if (data.motions != null) this.motions = data.motions
    if (data.dismissedResolvedMotionIds != null) this.dismissedResolvedMotionIds = data.dismissedResolvedMotionIds
    if (data.points != null) this.points = data.points
    if (data.dismissedPointIds != null) this.dismissedPointIds = data.dismissedPointIds
    if (data.draftResolutions != null) this.draftResolutions = data.draftResolutions
    if (data.documentNames != null) this.documentNames = data.documentNames
    if (data.votingSessions != null) this.votingSessions = data.votingSessions
    if (data.minutes != null) this.minutes = data.minutes

    // 还原 speakerList
    if (data.speakerLists) {
      this.speakerList = SpeakerList.fromJSON(data.speakerLists, this.delegations)
    }

    // 恢复 activeCaucus 中 caucusSpeakers 的 delegation 引用
    if (data.activeCaucus?.caucusSpeakers) {
      this.activeCaucus = {
        ...data.activeCaucus,
        caucusSpeakers: data.activeCaucus.caucusSpeakers.map((s: SpeakerEntry) => {
          const del = this.delegations.find((d) => d.id === s.delegationId)
          return { ...s, delegation: del }
        })
      }
    } else if (data.activeCaucus != null) {
      this.activeCaucus = data.activeCaucus as Conference['activeCaucus']
    }

    // 其他运行时状态
    if (data.activeSpeaker != null) this.activeSpeaker = data.activeSpeaker
    if (data.yieldPending != null) this.yieldPending = data.yieldPending
    if (data.caucusSetup != null) this.caucusSetup = data.caucusSetup
  }

  // ================================================================
  //  发言名单快捷属性
  // ================================================================

  get currentSpeaker(): SpeakerEntry | null {
    return this.speakerList.current
  }

  get nextSpeaker(): SpeakerEntry | null {
    return this.speakerList.next
  }

  get readySpeaker(): SpeakerEntry | null {
    return this.speakerList.ready
  }

  get waitingSpeakers(): SpeakerEntry[] {
    return this.speakerList.waiting
  }

  // ================================================================
  //  点名
  // ================================================================

  setAttendance(delegationId: string, attendance: 'present' | 'absent'): void {
    this.delegations = this.delegations.map((d) =>
      d.id === delegationId ? { ...d, attendance } : d
    )
    this.touch()
  }

  completeRollCall(): void {
    const presentCount = this.delegations.filter((d) => d.attendance === 'present').length
    const votingCount = this.delegations.filter((d) => d.attendance === 'present' && d.vetoPower !== false).length
    const simpleMajority = Math.floor(votingCount / 2) + 1
    const twoThirds = Math.ceil((votingCount * 2) / 3)

    const observerCount = presentCount - votingCount
    const detail = observerCount > 0
      ? `点名完成: 实到 ${presentCount}/${this.delegations.length}（含观察员 ${observerCount}），可投票 ${votingCount}，简单多数 ${simpleMajority} 票，2/3多数 ${twoThirds} 票`
      : `点名完成: 实到 ${presentCount}/${this.delegations.length}，简单多数 ${simpleMajority} 票，2/3多数 ${twoThirds} 票`
    this.addMinutesEntry('roll_call_completed', detail)
    this.addMinutesEntry('phase_changed', '进入阶段: 等待开启主发言名单')
    this.phase = 'pending_speakers_list'
    this.touch()
  }

  resetRollCall(): void {
    this.addMinutesEntry('roll_call_reset', '重新点名: 所有代表团出席状态已重置')
    this.addMinutesEntry('phase_changed', '进入阶段: 点名')
    this.phase = 'roll_call'
    this.delegations = this.delegations.map((d) => ({ ...d, attendance: 'absent' as const }))
    this.touch()
  }

  // ================================================================
  //  代表团管理
  // ================================================================

  addDelegation(name: string, shortName?: string): string {
    const id = generateId()
    const sortOrder = this.delegations.length
    this.delegations = [
      ...this.delegations,
      { id, name, shortName: shortName || undefined, attendance: 'absent', vetoPower: true, sortOrder }
    ]
    this.touch()
    return id
  }

  removeDelegation(id: string): void {
    this.delegations = this.delegations.filter((d) => d.id !== id)
    this.touch()
  }

  updateDelegation(id: string, updates: Partial<Delegation>): void {
    this.delegations = this.delegations.map((d) =>
      d.id === id ? { ...d, ...updates } : d
    )
    this.touch()
  }

  getDelegation(id: string): Delegation | undefined {
    return this.delegations.find((d) => d.id === id)
  }

  // ================================================================
  //  主发言名单操作
  // ================================================================

  addToSpeakersList(delegationId: string, customTimeSec?: number): string {
    const del = this.delegations.find((d) => d.id === delegationId)
    if (!del) return ''

    const timeSec = customTimeSec ?? this.defaultSpeakingTimeSec
    const list = this.speakerList
    const entryId = list.add(del, timeSec)

    this.speakersListHasBeenPopulated = true
    this.addMinutesEntry('speaker_started', `${del.name} 加入主发言名单`)
    this.touch()
    return entryId
  }

  removeFromSpeakersList(entryId: string): void {
    this.speakerList.remove(entryId)
    this.touch()
  }

  readySpeakerEntry(entryId: string): void {
    this.speakerList.readySpeaker(entryId)
    const entry = this.speakerList.entries.find((s) => s.id === entryId)
    const del = entry?.delegation
    this.addMinutesEntry('phase_changed', `${del?.name ?? entry?.delegationId} 准备发言`)
    this.touch()
  }

  startSpeakingEntry(entryId: string): void {
    const list = this.speakerList
    const entry = list.entries.find((s) => s.id === entryId)
    if (!entry) return

    const now = Date.now()
    const allocSec = entry.allocatedTimeSec
    list.startSpeaking(entryId)

    this.activeSpeaker = {
      entryId,
      startedAt: now,
      endAt: now + allocSec * 1000
    }

    const del = entry.delegation
    this.addMinutesEntry(
      'speaker_started',
      `${del?.name ?? entry.delegationId} 开始发言 (${allocSec}秒)`
    )
    this.touch()
  }

  pauseSpeaking(): void {
    if (!this.activeSpeaker) return
    const now = Date.now()
    this.activeSpeaker = { ...this.activeSpeaker, pausedAt: now }
    this.touch()
  }

  resumeSpeaking(remainingSec: number): void {
    if (!this.activeSpeaker) return
    const now = Date.now()
    this.activeSpeaker = {
      ...this.activeSpeaker,
      startedAt: now,
      endAt: now + remainingSec * 1000,
      pausedAt: undefined
    }
    this.yieldPending = null
    this.touch()
  }

  endSpeaking(yieldChoice?: YieldChoice): void {
    const speaker = this.activeSpeaker
    if (!speaker) return

    const list = this.speakerList
    const entry = list.entries.find((s) => s.id === speaker.entryId)
    const elapsed = (Date.now() - speaker.startedAt) / 1000
    const remaining = Math.max(0, (entry?.allocatedTimeSec ?? 120) - elapsed)

    list.finishCurrent()
    this.activeSpeaker = null
    this.yieldPending = null

    // 主发言名单曾被填充且现已清空 → 回到等待动议状态
    if (
      this.phase === 'general_debate' &&
      this.speakersListHasBeenPopulated &&
      this.speakerList.entries.length === 0
    ) {
      this.phase = 'pending_speakers_list'
      this.addMinutesEntry('phase_changed', '主发言名单已清空，需重新动议开启')
    }

    const del = entry?.delegation
    let logMsg = `${del?.name ?? entry?.delegationId} 发言结束`
    if (yieldChoice) {
      const yieldLabels: Record<string, string> = {
        chair: '让渡给主席团',
        delegate: '让渡给另一位代表',
        question: '让渡给提问',
        comment: '让渡给评论'
      }
      logMsg += `（${yieldLabels[yieldChoice.type] ?? yieldChoice.type}，剩余 ${Math.round(remaining)} 秒）`
      this.addMinutesEntry('yield', logMsg, { delegationId: entry?.delegationId })
    } else {
      this.addMinutesEntry('speaker_finished', logMsg, { delegationId: entry?.delegationId })
    }
    this.touch()
  }

  // ================================================================
  //  让渡
  // ================================================================

  handleYield(yieldChoice: YieldChoice): void {
    const speaker = this.activeSpeaker
    if (!speaker) return

    const list = this.speakerList
    const entry = list.entries.find((s) => s.id === speaker.entryId)
    if (!entry) return

    const elapsed = (Date.now() - speaker.startedAt) / 1000
    const remaining = Math.max(0, (entry.allocatedTimeSec ?? 120) - elapsed)
    const del = entry.delegation

    // 记录让渡选择到 speaker entry
    list.entries = list.entries.map((s) =>
      s.id === entry.id ? { ...s, yield: yieldChoice } : s
    )

    const yieldLabels: Record<string, string> = {
      chair: '让渡给主席团',
      delegate: '让渡给另一位代表',
      question: '让渡给提问',
      comment: '让渡给评论'
    }
    const logMsg = `${del?.name ?? entry.delegationId} ${yieldLabels[yieldChoice.type] ?? yieldChoice.type}（剩余 ${Math.round(remaining)} 秒）`
    this.addMinutesEntry('yield', logMsg, { delegationId: entry.delegationId })

    if (yieldChoice.type === 'chair') {
      this.resolveYieldToChair()
      return
    }

    // delegate / question / comment → 暂停计时器，设置 yieldPending
    const delegationName = del?.name ?? entry.delegationId
    this.activeSpeaker = speaker.pausedAt != null ? speaker : { ...speaker, pausedAt: Date.now() }
    this.yieldPending = {
      originalEntryId: entry.id,
      originalDelegationId: entry.delegationId,
      originalDelegationName: delegationName,
      yieldType: yieldChoice.type as 'delegate' | 'question' | 'comment',
      remainingSec: remaining,
      allocatedSec: entry.allocatedTimeSec
    }
    this.touch()
  }

  resolveYieldToChair(): void {
    const yp = this.yieldPending
    const entryId = yp?.originalEntryId ?? this.activeSpeaker?.entryId

    if (entryId) {
      this.speakerList.remove(entryId)
    }
    this.activeSpeaker = null
    this.yieldPending = null

    if (yp) {
      this.addMinutesEntry('speaker_finished',
        `${yp.originalDelegationName} 让渡给主席团，剩余时间作废`,
        { delegationId: yp.originalDelegationId })
    }
    this.touch()
  }

  resolveYieldToDelegate(targetDelegationId: string): void {
    const yp = this.yieldPending
    if (!yp || yp.yieldType !== 'delegate') return

    const targetDel = this.delegations.find((d) => d.id === targetDelegationId)
    if (!targetDel) return

    const list = this.speakerList
    const newEntry: SpeakerEntry = {
      id: generateId(),
      delegationId: targetDelegationId,
      addedAt: Date.now(),
      allocatedTimeSec: Math.round(yp.remainingSec),
      status: 'ready',
      canYield: false,
      delegation: targetDel
    }

    list.entries = [newEntry, ...list.entries.filter((s) => s.id !== yp.originalEntryId)]
    this.activeSpeaker = null
    this.yieldPending = null

    this.addMinutesEntry('speaker_finished',
      `${yp.originalDelegationName} 让渡给 ${targetDel.name}（剩余 ${Math.round(yp.remainingSec)} 秒）`,
      { delegationId: yp.originalDelegationId })
    this.touch()
  }

  resolveYieldToQuestion(questionerDelegationId: string): void {
    const yp = this.yieldPending
    if (!yp || yp.yieldType !== 'question') return

    const questionerDel = this.delegations.find((d) => d.id === questionerDelegationId)
    if (!questionerDel) return

    const list = this.speakerList
    this.activeSpeaker = this.activeSpeaker
      ? { ...this.activeSpeaker, pausedAt: this.activeSpeaker.pausedAt ?? Date.now() }
      : null
    list.entries = list.entries.map((s) =>
      s.id === yp.originalEntryId ? { ...s, canYield: false } : s
    )
    this.yieldPending = {
      ...yp,
      questionerDelegationId: questionerDel.id,
      questionerDelegationName: questionerDel.name
    }

    this.addMinutesEntry('yield',
      `${questionerDel.name} 向 ${yp.originalDelegationName} 提问（剩余 ${Math.round(yp.remainingSec)} 秒回答）`,
      { delegationId: questionerDel.id })
    this.touch()
  }

  resolveYieldToComment(commenterDelegationId: string): void {
    const yp = this.yieldPending
    if (!yp || yp.yieldType !== 'comment') return

    const commenterDel = this.delegations.find((d) => d.id === commenterDelegationId)
    if (!commenterDel) return

    const list = this.speakerList
    const newEntry: SpeakerEntry = {
      id: generateId(),
      delegationId: commenterDelegationId,
      addedAt: Date.now(),
      allocatedTimeSec: Math.round(yp.remainingSec),
      status: 'ready',
      canYield: false,
      delegation: commenterDel
    }

    list.entries = [newEntry, ...list.entries.filter((s) => s.id !== yp.originalEntryId)]
    this.activeSpeaker = null
    this.yieldPending = null

    this.addMinutesEntry('yield',
      `${commenterDel.name} 获得 ${Math.round(yp.remainingSec)} 秒评论时间（来自 ${yp.originalDelegationName} 的让渡）`,
      { delegationId: commenterDel.id })
    this.touch()
  }

  cancelYieldPending(): void {
    this.yieldPending = null
    this.touch()
  }

  // ================================================================
  //  动议
  // ================================================================

  proposeMotion(motionData: Omit<Motion, 'id' | 'proposedAt' | 'status'>): string {
    const id = generateId()
    const now = Date.now()
    const motion = { ...motionData, id, proposedAt: now, status: 'pending' } as Motion

    this.motions = [...this.motions, motion]

    const del = this.delegations.find((d) => d.id === motion.proposedByDelegationId)
    const motionLabel =
      motion.type === 'moderated_caucus' ? `有主持核心磋商: ${(motion as any).topic}` : motion.type
    this.addMinutesEntry(
      'motion_proposed',
      `${del?.name ?? motion.proposedByDelegationId} 提出动议: ${motionLabel}`,
      { delegationId: motion.proposedByDelegationId, motionId: id }
    )
    this.touch()
    return id
  }

  approveMotion(motionId: string): void {
    const motion = this.motions.find((m) => m.id === motionId)
    if (!motion) return

    this.motions = this.motions.map((m) =>
      m.id === motionId ? { ...m, status: 'approved' as const } : m
    )
    this.addMinutesEntry('motion_approved', '动议通过', { motionId })
    this.executeMotionAction(motion)
    this.touch()
  }

  rejectMotion(motionId: string): void {
    this.motions = this.motions.map((m) =>
      m.id === motionId ? { ...m, status: 'rejected' as const } : m
    )
    this.addMinutesEntry('motion_rejected', '动议未通过', { motionId })
    this.touch()
  }

  dismissLastResolvedMotion(): void {
    const resolved = this.motions
      .filter((m) => m.status === 'approved' || m.status === 'rejected')
      .filter((m) => !this.dismissedResolvedMotionIds.includes(m.id))
    const last = resolved.length > 0 ? resolved[resolved.length - 1] : null
    if (!last) return
    this.dismissedResolvedMotionIds = [...this.dismissedResolvedMotionIds, last.id]
    this.touch()
  }

  private executeMotionAction(motion: Motion): void {
    switch (motion.type) {
      case 'open_speakers_list':
        this.executeOpenSpeakersList()
        break
      case 'moderated_caucus':
        this.executeModeratedCaucusMotion(motion)
        break
      case 'unmoderated_caucus':
        this.startCaucusImpl(motion.id)
        break
      case 'suspend_meeting':
        this.suspendMeeting()
        break
      case 'close_meeting':
        this.closeMeeting()
        break
      case 'modify_speaking_time':
        this.executeModifySpeakingTime(motion)
        break
      case 'closure_debate':
        this.executeClosureDebate()
        break
      case 'substantive_vote':
        this.executeSubstantiveVote(motion)
        break
      case 'change_attendance':
        this.executeChangeAttendance(motion)
        break
    }
  }

  private executeOpenSpeakersList(): void {
    const now = Date.now()
    this.votingSessions = this.votingSessions.map((s) =>
      !s.endedAt ? { ...s, endedAt: now } : s
    )
    this.phase = 'general_debate'
    this.speakersListHasBeenPopulated = false
    this.addMinutesEntry('phase_changed', '进入阶段: 一般性辩论（主发言名单已开启）')
    this.touch()
  }

  private executeModeratedCaucusMotion(motion: Motion): void {
    if (this.activeSpeaker && !this.speakerList.current?.yield) {
      const entryId = this.activeSpeaker.entryId
      this.speakerList.remove(entryId)
      this.activeSpeaker = null
      this.addMinutesEntry('speaker_interrupted', '发言人时间作废（磋商动议通过）')
    }
    const proposerDelId = (motion as any).proposedByDelegationId as string
    this.phase = 'caucus_setup'
    this.caucusSetup = {
      motionId: motion.id,
      proposerPosition: 'first',
      speakerDelegationIds: proposerDelId ? [proposerDelId] : []
    }
    this.touch()
  }

  private executeModifySpeakingTime(motion: Motion): void {
    const newTime = (motion as any).newTimeSec as number
    this.defaultSpeakingTimeSec = newTime
    const list = this.speakerList
    list.entries = list.entries.map((s) =>
      s.status === 'waiting' || s.status === 'ready'
        ? { ...s, allocatedTimeSec: newTime }
        : s
    )
    this.touch()
  }

  private executeClosureDebate(): void {
    if (this.activeSpeaker) {
      this.activeSpeaker = null
    }
    if (this.activeCaucus) {
      this.activeCaucus = null
      this.addMinutesEntry('caucus_ended', '辩论结束，磋商终止')
    }
    this.phase = 'voting'
    this.addMinutesEntry('phase_changed', '进入阶段: 投票表决')
    this.touch()
  }

  private executeSubstantiveVote(motion: Motion): void {
    const docName = (motion as any).documentName as string
    if (docName) {
      this.addDocumentName(docName)
    }
    const sessionId = this.startVotingSession('motion', motion.id, 'two_thirds')
    this.addMinutesEntry(
      'voting_started',
      `对「${docName || '未命名文件'}」开始实质性投票 (2/3多数)`
    )
  }

  /** 更改代表团出席状态（统一入口：动议 & 直接管理均通过此方法） */
  changeDelegationAttendance(delegationId: string, newAttendance: 'present' | 'absent'): void {
    this.setAttendance(delegationId, newAttendance)
    const del = this.delegations.find((d) => d.id === delegationId)
    const label = newAttendance === 'present' ? '出席' : '缺席'
    this.addMinutesEntry(
      'phase_changed',
      `${del?.name ?? delegationId} 出席状态变更为 ${label}`,
      { delegationId }
    )
    this.touch()
    // 推送出席变更通知到 Display
    getDisplayBridge().sendUpdate(
      buildDisplayData(this, {
        attendanceChange: del
      })
    )
  }

  private executeChangeAttendance(motion: Motion): void {
    if (motion.type !== 'change_attendance') return
    const { proposedByDelegationId, newAttendance } = motion as any
    this.changeDelegationAttendance(proposedByDelegationId, newAttendance)
  }

  // ================================================================
  //  问题
  // ================================================================

  raisePoint(type: PointType, delegationId: string): string {
    const id = generateId()
    const now = Date.now()
    const point: Point = { id, type, proposedByDelegationId: delegationId, proposedAt: now }

    this.points = [...this.points, point]

    // 程序性问题：若有活跃发言人且未暂停，则自动暂停计时器
    if (type === 'point_of_order' && this.activeSpeaker && this.activeSpeaker.pausedAt == null) {
      this.pauseSpeaking()
    }

    const del = this.delegations.find((d) => d.id === delegationId)
    const pointLabel = POINT_LABELS[point.type]
    this.addMinutesEntry(
      'point_proposed',
      `${del?.name ?? delegationId} 提出${pointLabel}`,
      { delegationId }
    )
    this.touch()
    return id
  }

  dismissLatestPoint(): void {
    if (this.points.length === 0) return
    const lastPoint = this.points[this.points.length - 1]
    if (this.dismissedPointIds.includes(lastPoint.id)) return
    this.dismissedPointIds = [...this.dismissedPointIds, lastPoint.id]
    this.touch()
  }

  // ================================================================
  //  磋商
  // ================================================================

  startCaucus(motionId: string): void {
    const motion = this.motions.find((m) => m.id === motionId)
    if (!motion) return
    this.startCaucusImpl(motionId)
  }

  private startCaucusImpl(motionId: string): void {
    const motion = this.motions.find((m) => m.id === motionId)
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

    this.phase = 'caucus'
    this.activeCaucus = { motionId, type: caucusType, startedAt: now, endAt, elapsedSec: 0 }

    const label = caucusType === 'moderated' ? '有主持核心磋商' : '自由磋商'
    this.addMinutesEntry('caucus_started', `${label}开始${topic ? ': ' + topic : ''}`, { motionId })
    this.addMinutesEntry('phase_changed', '进入阶段: 磋商')
    this.touch()
  }

  setCaucusProposerPosition(position: 'first' | 'last'): void {
    if (!this.caucusSetup) return
    const motion = this.motions.find((m) => m.id === this.caucusSetup!.motionId)
    const proposerId = (motion as any)?.proposedByDelegationId as string | undefined
    if (!proposerId) {
      this.caucusSetup = { ...this.caucusSetup, proposerPosition: position }
      return
    }

    const ids = this.caucusSetup.speakerDelegationIds.filter((id) => id !== proposerId)
    const reordered = position === 'first' ? [proposerId, ...ids] : [...ids, proposerId]
    this.caucusSetup = { ...this.caucusSetup, proposerPosition: position, speakerDelegationIds: reordered }
  }

  addToCaucusSpeakersSetup(delegationId: string): void {
    if (!this.caucusSetup) return
    if (this.caucusSetup.speakerDelegationIds.includes(delegationId)) return

    const motion = this.motions.find((m) => m.id === this.caucusSetup!.motionId)
    const proposerId = (motion as any)?.proposedByDelegationId as string | undefined

    const ids = this.caucusSetup.speakerDelegationIds
    const newIds =
      this.caucusSetup.proposerPosition === 'last' && proposerId
        ? [...ids.slice(0, -1), delegationId, proposerId]
        : [...ids, delegationId]

    const perSpeakerSec = (motion as any)?.speakingTimePerPersonSec ?? 60
    const totalSec = this.caucusSetup.remainingSec ?? (motion as any)?.totalTimeSec ?? 0
    const maxSpeakers = Math.floor(totalSec / perSpeakerSec)
    if (newIds.length > maxSpeakers) return

    this.caucusSetup = { ...this.caucusSetup, speakerDelegationIds: newIds }
  }

  removeFromCaucusSpeakersSetup(delegationId: string): void {
    if (!this.caucusSetup) return
    this.caucusSetup = {
      ...this.caucusSetup,
      speakerDelegationIds: this.caucusSetup.speakerDelegationIds.filter((id) => id !== delegationId)
    }
  }

  startCaucusWithSetup(): void {
    if (!this.caucusSetup) return

    const { motionId, speakerDelegationIds, remainingSec } = this.caucusSetup
    const motion = this.motions.find((m) => m.id === motionId)
    if (!motion) return

    const now = Date.now()
    const perSpeakerSec = ((motion as any).speakingTimePerPersonSec as number) ?? 60
    const totalSec = remainingSec ?? ((motion as any).totalTimeSec as number)
    const topic = (motion as any).topic

    const maxSpeakers = Math.max(1, Math.floor(totalSec / perSpeakerSec))
    const trimmedIds = speakerDelegationIds.slice(0, maxSpeakers)

    const caucusSpeakers: SpeakerEntry[] = trimmedIds.map((delId) => {
      const del = this.delegations.find((d) => d.id === delId)
      return {
        id: generateId(),
        delegationId: delId,
        addedAt: now,
        allocatedTimeSec: perSpeakerSec,
        status: 'waiting' as const,
        delegation: del
      }
    })

    if (caucusSpeakers.length > 0) {
      caucusSpeakers[0] = { ...caucusSpeakers[0], status: 'ready' }
    }

    this.phase = 'caucus'
    this.caucusSetup = null
    this.activeCaucus = {
      motionId,
      type: 'moderated',
      startedAt: now,
      endAt: now + totalSec * 1000,
      elapsedSec: 0,
      caucusSpeakers,
      currentSpeakerIndex: caucusSpeakers.length > 0 ? 0 : undefined
    }
    this.activeSpeaker = null

    const firstName = caucusSpeakers[0]?.delegation?.name ?? ''
    this.addMinutesEntry(
      'caucus_started',
      `有主持核心磋商开始${topic ? ': ' + topic : ''}，首位发言人（就绪）: ${firstName}`,
      { motionId }
    )
    this.addMinutesEntry('phase_changed', '进入阶段: 磋商')
    this.touch()
  }

  advanceCaucusSpeaker(): void {
    if (!this.activeCaucus?.caucusSpeakers) return

    const speakers = this.activeCaucus.caucusSpeakers
    const currentIdx = this.activeCaucus.currentSpeakerIndex ?? -1

    const updatedSpeakers = speakers.filter((_, i) => i !== currentIdx)

    const totalRemaining = (this.activeCaucus.endAt - Date.now()) / 1000
    const motion = this.motions.find((m) => m.id === this.activeCaucus!.motionId) as any
    const perSpeakerSec = motion?.speakingTimePerPersonSec ?? 60
    const nextIdx = currentIdx

    if (nextIdx < updatedSpeakers.length && totalRemaining >= perSpeakerSec) {
      updatedSpeakers[nextIdx] = { ...updatedSpeakers[nextIdx], status: 'ready' }
      const nextName = updatedSpeakers[nextIdx].delegation?.name ?? updatedSpeakers[nextIdx].delegationId

      this.activeCaucus = {
        ...this.activeCaucus!,
        caucusSpeakers: updatedSpeakers,
        currentSpeakerIndex: nextIdx
      }
      this.activeSpeaker = null
      this.addMinutesEntry('speaker_ready', `${nextName} 准备发言（等待主席开始计时）`)
    } else if (nextIdx < updatedSpeakers.length && totalRemaining < perSpeakerSec) {
      this.endCaucus()
    } else if (totalRemaining >= perSpeakerSec) {
      this.phase = 'caucus_setup'
      const previousMotionId = this.activeCaucus!.motionId
      this.activeCaucus = null
      this.activeSpeaker = null
      this.caucusSetup = {
        motionId: previousMotionId,
        proposerPosition: 'first',
        speakerDelegationIds: [],
        remainingSec: totalRemaining
      }
      this.addMinutesEntry('caucus_paused', '名单已走完，返回磋商准备以添加更多发言人')
    } else {
      this.endCaucus()
    }
    this.touch()
  }

  startCaucusSpeakerEntry(): void {
    if (!this.activeCaucus?.caucusSpeakers) return

    const speakers = this.activeCaucus.caucusSpeakers
    const readyIdx = speakers.findIndex((s) => s.status === 'ready')
    if (readyIdx < 0) return

    const readySpeaker = speakers[readyIdx]
    const perSpeakerSec = readySpeaker.allocatedTimeSec
    const now = Date.now()

    const updatedSpeakers = speakers.map((s, i) =>
      i === readyIdx ? { ...s, status: 'speaking' as const } : s
    )

    this.activeCaucus = {
      ...this.activeCaucus,
      caucusSpeakers: updatedSpeakers,
      currentSpeakerIndex: readyIdx
    }
    this.activeSpeaker = {
      entryId: readySpeaker.delegationId,
      startedAt: now,
      endAt: now + perSpeakerSec * 1000
    }

    const speakerName = readySpeaker.delegation?.name ?? readySpeaker.delegationId
    this.addMinutesEntry('speaker_started', `${speakerName} 开始发言 (${perSpeakerSec}秒)`)
    this.touch()
  }

  appendCaucusSpeaker(delegationId: string): void {
    if (!this.activeCaucus?.caucusSpeakers) return

    const currentSpeakers = this.activeCaucus.caucusSpeakers
    if (currentSpeakers.some((s) => s.delegationId === delegationId)) return

    const del = this.delegations.find((d) => d.id === delegationId)
    const motion = this.motions.find((m) => m.id === this.activeCaucus!.motionId) as any
    const perSpeakerSec = motion?.speakingTimePerPersonSec ?? 60

    const totalRemaining = (this.activeCaucus.endAt - Date.now()) / 1000
    const futureCount = currentSpeakers.length + 1
    if (futureCount * perSpeakerSec > totalRemaining) return

    const newSpeaker: SpeakerEntry = {
      id: generateId(),
      delegationId,
      addedAt: Date.now(),
      allocatedTimeSec: perSpeakerSec,
      status: 'waiting' as const,
      delegation: del
    }

    const hasActiveSpeaker = this.activeSpeaker != null

    if (hasActiveSpeaker) {
      this.activeCaucus = {
        ...this.activeCaucus,
        caucusSpeakers: [...currentSpeakers, newSpeaker]
      }
    } else {
      this.activeCaucus = {
        ...this.activeCaucus,
        caucusSpeakers: [...currentSpeakers, { ...newSpeaker, status: 'ready' }],
        currentSpeakerIndex: this.activeCaucus.caucusSpeakers.length
      }
      this.addMinutesEntry('speaker_ready', `${del?.name ?? delegationId} 准备发言（等待主席开始计时）`)
    }
    this.touch()
  }

  pauseCaucus(): void {
    if (!this.activeCaucus) return
    const now = Date.now()
    this.activeCaucus = { ...this.activeCaucus, pausedAt: now }
    this.touch()
  }

  resumeCaucus(remainingSec: number): void {
    if (!this.activeCaucus) return
    const now = Date.now()
    this.activeCaucus = {
      ...this.activeCaucus,
      endAt: now + remainingSec * 1000,
      pausedAt: undefined
    }
    this.touch()
  }

  endCaucus(): void {
    this.phase = 'general_debate'
    this.activeCaucus = null
    this.addMinutesEntry('caucus_ended', '磋商结束')
    this.addMinutesEntry('phase_changed', '进入阶段: 一般性辩论')
    this.touch()
  }

  // ================================================================
  //  投票
  // ================================================================

  startVotingSession(
    targetType: 'motion' | 'resolution',
    targetId: string,
    majorityRule: 'simple_majority' | 'two_thirds'
  ): string {
    const id = generateId()

    // 仅出席且拥有投票权的代表团参与表决（观察员除外）
    const presentDelegations = [...this.delegations]
      .filter((d) => d.attendance === 'present' && d.vetoPower !== false)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const firstDelegationId = presentDelegations[0]?.id ?? null

    const session: VotingSession = {
      id,
      targetType,
      targetId,
      majorityRule,
      ballots: [],
      startedAt: Date.now(),
      currentDelegationId: firstDelegationId,
      round: 1
    }

    this.phase = 'voting'
    this.votingSessions = [...this.votingSessions, session]

    this.addMinutesEntry(
      'voting_started',
      `开始投票表决 (${majorityRule === 'simple_majority' ? '简单多数' : '2/3多数'})`
    )
    this.addMinutesEntry('phase_changed', '进入阶段: 投票表决')
    this.touch()
    return id
  }

  castVote(
    sessionId: string,
    delegationId: string,
    vote: 'yes' | 'no' | 'abstain' | 'skip'
  ): void {
    const sessionIdx = this.votingSessions.findIndex((s) => s.id === sessionId)
    if (sessionIdx < 0) return

    const session = this.votingSessions[sessionIdx]
    if (session.currentDelegationId !== delegationId) {
      console.warn(`castVote: delegation ${delegationId} is not the current voter (current=${session.currentDelegationId})`)
      return
    }

    if (session.round >= 2 && (vote === 'abstain' || vote === 'skip')) {
      console.warn(`castVote: round ${session.round} does not allow ${vote}`)
      return
    }

    const existing = session.ballots.findIndex((b) => b.delegationId === delegationId)
    const newBallot: VoteBallot = { delegationId, vote }
    let ballots: VoteBallot[]
    if (existing >= 0) {
      ballots = session.ballots.map((b, i) => (i === existing ? newBallot : b))
    } else {
      ballots = [...session.ballots, newBallot]
    }

    // 仅出席且拥有投票权的代表团参与表决（观察员除外）
    const presentDelegations = [...this.delegations]
      .filter((d) => d.attendance === 'present' && d.vetoPower !== false)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const { nextDelegationId, nextRound } = this.advanceVoting(
      session.round,
      delegationId,
      ballots,
      presentDelegations
    )

    this.votingSessions = this.votingSessions.map((s, i) =>
      i === sessionIdx
        ? { ...s, ballots, currentDelegationId: nextDelegationId, round: nextRound }
        : s
    )
    this.touch()
  }

  private advanceVoting(
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

  closeVotingSession(sessionId: string): void {
    const sessionIdx = this.votingSessions.findIndex((s) => s.id === sessionId)
    if (sessionIdx < 0) return

    const session = this.votingSessions[sessionIdx]
    if (session.currentDelegationId !== null) {
      console.warn('closeVotingSession: not all delegations have voted yet')
      return
    }

    const { yes, no, abstain } = tallyVotesEngine(session.ballots)
    // 仅统计拥有投票权的出席代表（排除观察员）
    const presentCount = this.delegations.filter((d) => d.attendance === 'present' && d.vetoPower !== false).length
    const threshold =
      session.majorityRule === 'simple_majority'
        ? Math.floor(presentCount / 2) + 1
        : Math.ceil((presentCount * 2) / 3)
    const result: 'passed' | 'failed' = yes >= threshold ? 'passed' : 'failed'

    const now = Date.now()

    let newMotions = this.motions
    let newPhase = this.phase
    let newActiveSpeaker = this.activeSpeaker
    let newActiveCaucus = this.activeCaucus
    let newDefaultSpeakingTimeSec = this.defaultSpeakingTimeSec
    let newSpeakersList = this.speakerList.entries

    if (session.targetType === 'motion') {
      const motion = this.motions.find((m) => m.id === session.targetId)
      if (motion) {
        if (motion.type === 'substantive_vote') {
          const docName = (motion as any).documentName as string
          newSpeakersList = []
          this.addMinutesEntry('phase_changed', '主发言名单已结束')
        } else {
          const motionStatus: 'approved' | 'rejected' = result === 'passed' ? 'approved' : 'rejected'
          newMotions = this.motions.map((m) =>
            m.id === session.targetId ? { ...m, status: motionStatus } : m
          )

          if (result === 'passed') {
            if (motion.type === 'suspend_meeting') {
              newPhase = 'suspended'
              newActiveSpeaker = null
              newActiveCaucus = null
              this.addMinutesEntry('meeting_suspended', '暂时休会')
              this.addMinutesEntry('phase_changed', '进入阶段: 休会')
            } else if (motion.type === 'close_meeting') {
              newPhase = 'closed'
              newActiveSpeaker = null
              newActiveCaucus = null
              this.addMinutesEntry('meeting_closed', '会议闭幕')
              this.addMinutesEntry('phase_changed', '进入阶段: 闭幕')
            } else if (motion.type === 'closure_debate') {
              newPhase = 'voting'
              newActiveSpeaker = null
              newActiveCaucus = null
              this.addMinutesEntry('phase_changed', '进入阶段: 投票表决')
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
              this.addMinutesEntry('caucus_started', '自由磋商开始')
              this.addMinutesEntry('phase_changed', '进入阶段: 磋商')
            } else if (motion.type === 'modify_speaking_time') {
              const newTime = (motion as any).newTimeSec as number
              newDefaultSpeakingTimeSec = newTime
              newSpeakersList = this.speakerList.entries.map((s) =>
                s.status === 'waiting' || s.status === 'ready'
                  ? { ...s, allocatedTimeSec: newTime }
                  : s
              )
            }
          }
        }
      }
    }

    this.addMinutesEntry(
      'voting_ended',
      `投票结束: Yes ${yes} / No ${no} / Abstain ${abstain} → ${result === 'passed' ? '通过' : '未通过'}`
    )

    this.phase = newPhase
    this.activeSpeaker = newActiveSpeaker
    this.activeCaucus = newActiveCaucus
    this.defaultSpeakingTimeSec = newDefaultSpeakingTimeSec
    this.speakerList.entries = newSpeakersList
    this.votingSessions = this.votingSessions.map((s, i) =>
      i === sessionIdx ? { ...s, endedAt: now, result } : s
    )
    this.motions = newMotions
    this.touch()
  }

  // ================================================================
  //  决议
  // ================================================================

  addDocumentName(name: string): void {
    const trimmed = name.trim()
    if (!trimmed) return
    const filtered = this.documentNames.filter((n) => n !== trimmed)
    this.documentNames = [trimmed, ...filtered].slice(0, 20)
    this.touch()
  }

  introduceResolution(
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
    this.draftResolutions = [...this.draftResolutions, resolution]
    this.addMinutesEntry('resolution_introduced', `决议草案提交: ${title}`, { resolutionId: id })
    this.touch()
    return id
  }

  // ================================================================
  //  会议控制
  // ================================================================

  suspendMeeting(): void {
    this.phase = 'suspended'
    this.activeSpeaker = null
    this.activeCaucus = null
    this.addMinutesEntry('meeting_suspended', '暂时休会')
    this.addMinutesEntry('phase_changed', '进入阶段: 休会')
    this.touch()
  }

  resumeMeeting(): void {
    this.phase = 'pending_speakers_list'
    this.addMinutesEntry('meeting_resumed', '会议恢复')
    this.addMinutesEntry('phase_changed', '进入阶段: 等待开启主发言名单')
    this.touch()
  }

  closeMeeting(): void {
    this.phase = 'closed'
    this.activeSpeaker = null
    this.activeCaucus = null
    this.addMinutesEntry('meeting_closed', '会议闭幕')
    this.addMinutesEntry('phase_changed', '进入阶段: 闭幕')
    this.touch()
  }

  setPhase(phase: ConferencePhase): void {
    this.phase = phase
    this.touch()
  }

  // ================================================================
  //  会议记录
  // ================================================================

  addMinutesEntry(
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
    this.minutes = [...this.minutes, entry]
  }

  // ================================================================
  //  投票统计（纯函数，代理到引擎函数）
  // ================================================================

  tallyVotes(ballots: VoteBallot[]): { yes: number; no: number; abstain: number } {
    return tallyVotesEngine(ballots)
  }

  getPresentCount(): number {
    return this.delegations.filter((d) => d.attendance === 'present').length
  }

  /** 拥有投票权的出席代表人数（排除观察员） */
  getVotingCount(): number {
    return this.delegations.filter((d) => d.attendance === 'present' && d.vetoPower !== false).length
  }

  getSimpleMajorityThreshold(): number {
    return Math.floor(this.getVotingCount() / 2) + 1
  }

  getTwoThirdsThreshold(): number {
    return Math.ceil((this.getVotingCount() * 2) / 3)
  }

  getMajorityThresholds() {
    return calculateMajorityThresholds(this.delegations)
  }

  // ================================================================
  //  序列化
  // ================================================================

  toJSON(): Conference {
    return {
      id: this.id,
      name: this.name,
      venue: this.venue,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      phase: this.phase,
      delegations: this.delegations,
      agenda: this.agenda,
      speakerLists: this.speakerList.toJSON(),
      motions: this.motions,
      dismissedResolvedMotionIds: this.dismissedResolvedMotionIds,
      points: this.points,
      dismissedPointIds: this.dismissedPointIds,
      draftResolutions: this.draftResolutions,
      documentNames: this.documentNames,
      votingSessions: this.votingSessions,
      minutes: this.minutes,
      defaultSpeakingTimeSec: this.defaultSpeakingTimeSec,
      caucusSetup: this.caucusSetup,
      activeCaucus: this.activeCaucus
        ? {
            ...this.activeCaucus,
            caucusSpeakers: this.activeCaucus.caucusSpeakers?.map((s) => {
              const { delegation, ...rest } = s
              return rest
            })
          }
        : null,
      activeSpeaker: this.activeSpeaker,
      yieldPending: this.yieldPending
    }
  }

  static fromJSON(json: Conference): ConferenceEngine {
    // 清理已过期的计时器状态
    const now = Date.now()
    const cleanJson = { ...json }
    if (cleanJson.activeSpeaker && cleanJson.activeSpeaker.endAt <= now) {
      // 同步清理发言名单中的对应条目
      const expiredEntryId = cleanJson.activeSpeaker.entryId
      if (cleanJson.speakerLists?.entries) {
        cleanJson.speakerLists = {
          ...cleanJson.speakerLists,
          entries: cleanJson.speakerLists.entries.filter((s) => s.id !== expiredEntryId)
        }
      }
      cleanJson.activeSpeaker = null
    }
    if (cleanJson.activeCaucus && cleanJson.activeCaucus.endAt <= now) {
      cleanJson.activeCaucus = null
    }
    return new ConferenceEngine(cleanJson)
  }

  // ================================================================
  //  工具
  // ================================================================

  /** 更新时间戳（每次变更时调用） */
  private touch(): void {
    this.updatedAt = Date.now()
  }

  /** 销毁引擎：停止所有 timer */
  destroy(): void {
    for (const timer of this.timers.values()) {
      timer.stop()
    }
    this.timers.clear()
  }
}
