/**
 * ConferenceEngine.svelte.ts
 * ──────────────────────────────────────────────
 * 模拟大会引擎：Committee + SpeakerList 类。
 *
 * 使用 Svelte 5 $state rune 实现响应式，组件可直接访问引擎属性。
 * 通过 Conference 接口序列化和反序列化纯 JSON。
 */

import type {
  Committee as CommitteeDTO,
  ConferencePhase,
  AgendaItem,
  SpeakerEntry,
  SpeakerListData,
  YieldChoice,
  YieldType,
  YieldPendingState,
  Motion,
  DraftResolution,
  VotingSession,
  VoteBallot,
  ConferenceEntry,
  ConferenceActionType,
  Point,
  PointType,
  CaucusType,
  ProposerPosition,
  MajorityRule,
  VoteTargetType
} from '$lib/classes/types/conference'
import {
  isParticipantSeat,
  type ParticipantSeat,
  type Seat,
  type Capability
} from '$lib/classes/types/delegate'
import { POINT_LABELS, MOTION_LABELS, type Attendance } from '$lib/classes/types/conference'
import { getDisplayBridge, buildDisplayData } from '$lib/classes/clients/conference-display-client'
import { emitServiceEvent } from '$lib/classes/services/event-bus-bridge'
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

  /** 添加席位到发言名单，返回 entryId */
  add(seat: Seat, allocatedTimeSec?: number): string {
    const id = generateId()
    const entry: SpeakerEntry = {
      id,
      seatId: seat.id,
      allocatedTimeSec: allocatedTimeSec ?? 120,
      status: 'waiting'
    }
    this.entries = [...this.entries, entry]
    return id
  }

  remove(entryId: string): void {
    this.entries = this.entries.filter((s) => s.id !== entryId)
  }

  readySpeaker(entryId: string): void {
    this.entries = this.entries.map((s) => (s.id === entryId ? { ...s, status: 'ready' } : s))
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
    // 标记当前发言人为 interrupted（状态由 Committee 管理）
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
      entries: this.entries
    }
  }

  static fromJSON(json: SpeakerListData, seats: Seat[]): SpeakerList {
    const entries: SpeakerEntry[] = json.entries
    return new SpeakerList(json.id, json.name, entries)
  }
}

// ====================================================================
//  Committee —— 委员会引擎
// ====================================================================

export class Committee {
  // ── 基础信息 ──
  id: string
  name: string = $state('')

  // ── 配置 ──
  defaultSpeakingTimeSec: number = $state(120)

  // ── 议题 ──
  agenda: AgendaItem[] = $state([])

  // ── 发言名单 ──
  speakerList: SpeakerList = new SpeakerList('main', '主发言名单')

  // ── 运行时状态 ──
  phase: ConferencePhase = $state('preamble')
  activeSpeaker: CommitteeDTO['activeSpeaker'] = $state(null)
  activeCaucus: CommitteeDTO['activeCaucus'] = $state(null)
  yieldPending: YieldPendingState | null = $state(null)
  caucusSetup: CommitteeDTO['caucusSetup'] = $state(null)
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
  minutes: ConferenceEntry[] = $state([])

  // ── 委员会席位（拥有 procedure 的席位参与议事） ──
  seats: Seat[] = $state([])

  // ── 计时器 ──
  timers: Map<string, Timer> = new Map()

  constructor(data?: Partial<CommitteeDTO>) {
    this.id = data?.id ?? generateId()
    if (data) {
      this.restoreFromConference(data)
    }
  }

  /** 从 Conference 数据还原状态 */
  private restoreFromConference(data: Partial<CommitteeDTO>): void {
    if (data.name != null) this.name = data.name
    if (data.defaultSpeakingTimeSec != null)
      this.defaultSpeakingTimeSec = data.defaultSpeakingTimeSec
    if (data.seats != null) this.seats = data.seats
    if (data.agenda != null) this.agenda = data.agenda
    if (data.phase != null) this.phase = data.phase
    if (data.motions != null) this.motions = data.motions as Motion[]
    if (data.dismissedResolvedMotionIds != null)
      this.dismissedResolvedMotionIds = data.dismissedResolvedMotionIds
    if (data.points != null) this.points = data.points
    if (data.dismissedPointIds != null) this.dismissedPointIds = data.dismissedPointIds
    if (data.draftResolutions != null) this.draftResolutions = data.draftResolutions
    if (data.documentNames != null) this.documentNames = data.documentNames
    if (data.votingSessions != null) this.votingSessions = data.votingSessions
    if (data.minutes != null) this.minutes = data.minutes

    // 还原 speakerList
    if (data.speakerLists) {
      this.speakerList = SpeakerList.fromJSON(data.speakerLists, this.seats)
    }

    if (data.activeCaucus?.caucusSpeakers) {
      this.activeCaucus = {
        ...data.activeCaucus,
        caucusSpeakers: data.activeCaucus.caucusSpeakers
      }
    } else if (data.activeCaucus != null) {
      this.activeCaucus = data.activeCaucus as CommitteeDTO['activeCaucus']
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

  get speakerLists(): SpeakerListData {
    return this.speakerList.toJSON()
  }

  get participantSeats(): ParticipantSeat[] {
    return this.seats.filter(isParticipantSeat)
  }

  // ================================================================
  //  点名
  // ================================================================

  setAttendance(seatId: string, attendance: Attendance): void {
    this.seats = this.seats.map((seat) =>
      seat.id === seatId && seat.procedure
        ? { ...seat, procedure: { ...seat.procedure, attendance } }
        : seat
    )
    this.touch()
  }

  completeRollCall(): void {
    const participants = this.participantSeats
    const presentCount = participants.filter((seat) => seat.procedure?.attendance === 'present').length
    const votingCount = participants.filter(
      (seat) => seat.procedure?.attendance === 'present' && seat.procedure.hasVotingRights
    ).length
    const simpleMajority = Math.floor(votingCount / 2) + 1
    const twoThirds = Math.ceil((votingCount * 2) / 3)

    const absentSeats = participants.filter((seat) => seat.procedure?.attendance !== 'present')
    const absentNames = absentSeats.map((seat) => seat.procedure?.shortName ?? seat.name).join('、')

    const observerCount = presentCount - votingCount
    let detail =
      observerCount > 0
        ? `点名完成: 实到 ${presentCount}/${participants.length}（含观察员 ${observerCount}），可投票 ${votingCount}，简单多数 ${simpleMajority} 票，2/3多数 ${twoThirds} 票`
        : `点名完成: 实到 ${presentCount}/${participants.length}，简单多数 ${simpleMajority} 票，2/3多数 ${twoThirds} 票`
    if (absentSeats.length > 0) {
      detail += `；缺席: ${absentNames}`
    }
    this.addConferenceEntry('roll_call_completed', detail)
    this.addConferenceEntry('phase_changed', '进入阶段: 等待开启主发言名单')
    this.phase = 'pending_speakers_list'
    this.touch()
  }

  resetRollCall(): void {
    this.addConferenceEntry('roll_call_reset', '重新点名: 所有参会席位出席状态已重置')
    this.addConferenceEntry('phase_changed', '进入阶段: 点名')
    this.phase = 'roll_call'
    this.seats = this.seats.map((seat) =>
      seat.procedure
        ? { ...seat, procedure: { ...seat.procedure, attendance: 'absent' } }
        : seat
    )
    this.touch()
  }

  // ================================================================
  //  主发言名单操作
  // ================================================================

  addToSpeakersList(seatId: string, customTimeSec?: number): string {
    const del = this.seats.find((d) => d.id === seatId)
    if (!del) return ''

    const timeSec = customTimeSec ?? this.defaultSpeakingTimeSec
    const list = this.speakerList
    const entryId = list.add(del, timeSec)

    this.speakersListHasBeenPopulated = true
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
    if (entry) {
      this.addConferenceEntry('speaker_ready', `${this.getSpeakerSeatName(entry)} 准备发言`)
    }
    this.touch()
  }

  startSpeakingEntry(entryId: string): void {
    const list = this.speakerList
    const entry = list.entries.find((s) => s.id === entryId)
    if (!entry) return

    const allocSec = entry.allocatedTimeSec
    list.startSpeaking(entryId)

    this.activeSpeaker = {
      entryId,
      totalSec: allocSec,
      elapsedSec: 0,
      paused: false
    }

    this.addConferenceEntry(
      'speaker_started',
      `${this.getSpeakerSeatName(entry)} 开始发言 (${allocSec}秒)`
    )
    this.touch()
  }

  pauseSpeaking(): void {
    if (!this.activeSpeaker) return
    this.activeSpeaker = { ...this.activeSpeaker, paused: true }
    this.touch()
  }

  resumeSpeaking(_remainingSec?: number): void {
    if (!this.activeSpeaker) return
    this.activeSpeaker = { ...this.activeSpeaker, paused: false }
    this.yieldPending = null
    this.touch()
  }

  endSpeaking(yieldChoice?: YieldChoice): void {
    const speaker = this.activeSpeaker
    if (!speaker) return

    const list = this.speakerList
    const entry = list.entries.find((s) => s.id === speaker.entryId)
    const elapsed = speaker.elapsedSec
    const remaining = Math.max(0, speaker.totalSec - elapsed)

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
      this.addConferenceEntry('phase_changed', '主发言名单已清空，需重新动议开启')
    }

    const speakerName = entry ? this.getSpeakerSeatName(entry) : speaker.entryId
    let logMsg = `${speakerName} 发言结束`
    if (yieldChoice) {
      const yieldLabels: Record<string, string> = {
        chair: '让渡给主席团',
        delegate: '让渡给另一位代表',
        question: '让渡给提问',
        comment: '让渡给评论'
      }
      logMsg += `（${yieldLabels[yieldChoice.type] ?? yieldChoice.type}，剩余 ${Math.round(remaining)} 秒）`
      this.addConferenceEntry('yield', logMsg, { seatId: entry?.seatId })
    } else {
      this.addConferenceEntry('speaker_finished', logMsg, { seatId: entry?.seatId })
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

    const elapsed = speaker.elapsedSec
    const remaining = Math.max(0, speaker.totalSec - elapsed)
    // 记录让渡选择到 speaker entry
    list.entries = list.entries.map((s) => (s.id === entry.id ? { ...s, yield: yieldChoice } : s))

    const yieldLabels: Record<string, string> = {
      chair: '让渡给主席团',
      delegate: '让渡给另一位代表',
      question: '让渡给提问',
      comment: '让渡给评论'
    }
    const logMsg = `${this.getSpeakerSeatName(entry)} ${yieldLabels[yieldChoice.type] ?? yieldChoice.type}（剩余 ${Math.round(remaining)} 秒）`
    this.addConferenceEntry('yield', logMsg, { seatId: entry.seatId })

    if (yieldChoice.type === 'chair') {
      this.resolveYieldToChair()
      return
    }

    // delegate / question / comment → 暂停计时器，设置 yieldPending
    this.activeSpeaker = speaker.paused ? speaker : { ...speaker, paused: true }
    this.yieldPending = {
      originalEntryId: entry.id,
      originalSeatId: entry.seatId,
      yieldType: yieldChoice.type as YieldType,
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
      const originalSeat = this.getSeat(yp.originalSeatId)
      this.addConferenceEntry(
        'speaker_finished',
        `${originalSeat?.name ?? yp.originalSeatId} 让渡给主席团，剩余时间作废`,
        { seatId: yp.originalSeatId }
      )
    }
    this.touch()
  }

  resolveYieldToDelegate(targetSeatId: string): void {
    const yp = this.yieldPending
    if (!yp || yp.yieldType !== 'delegate') return

    const targetDel = this.seats.find((d) => d.id === targetSeatId)
    if (!targetDel) return

    const list = this.speakerList
    const newEntry: SpeakerEntry = {
      id: generateId(),
      seatId: targetSeatId,
      allocatedTimeSec: Math.round(yp.remainingSec),
      status: 'ready',
      canYield: false
    }

    list.entries = [newEntry, ...list.entries.filter((s) => s.id !== yp.originalEntryId)]
    this.activeSpeaker = null
    this.yieldPending = null

    const originalSeat = this.getSeat(yp.originalSeatId)
    this.addConferenceEntry(
      'speaker_finished',
      `${originalSeat?.name ?? yp.originalSeatId} 让渡给 ${targetDel.name}（剩余 ${Math.round(yp.remainingSec)} 秒）`,
      { seatId: yp.originalSeatId }
    )
    this.touch()
  }

  resolveYieldToQuestion(questionerSeatId: string): void {
    const yp = this.yieldPending
    if (!yp || yp.yieldType !== 'question') return

    const questionerDel = this.seats.find((d) => d.id === questionerSeatId)
    if (!questionerDel) return

    const list = this.speakerList
    this.activeSpeaker = this.activeSpeaker ? { ...this.activeSpeaker, paused: true } : null
    list.entries = list.entries.map((s) =>
      s.id === yp.originalEntryId ? { ...s, canYield: false } : s
    )
    this.yieldPending = {
      ...yp,
      questionerSeatId: questionerDel.id
    }

    const originalSeat = this.getSeat(yp.originalSeatId)
    this.addConferenceEntry(
      'yield',
      `${questionerDel.name} 向 ${originalSeat?.name ?? yp.originalSeatId} 提问（剩余 ${Math.round(yp.remainingSec)} 秒回答）`,
      { seatId: questionerDel.id }
    )
    this.touch()
  }

  resolveYieldToComment(commenterSeatId: string): void {
    const yp = this.yieldPending
    if (!yp || yp.yieldType !== 'comment') return

    const commenterDel = this.seats.find((d) => d.id === commenterSeatId)
    if (!commenterDel) return

    const list = this.speakerList
    const newEntry: SpeakerEntry = {
      id: generateId(),
      seatId: commenterSeatId,
      allocatedTimeSec: Math.round(yp.remainingSec),
      status: 'ready',
      canYield: false
    }

    list.entries = [newEntry, ...list.entries.filter((s) => s.id !== yp.originalEntryId)]
    this.activeSpeaker = null
    this.yieldPending = null

    const originalSeat = this.getSeat(yp.originalSeatId)
    this.addConferenceEntry(
      'yield',
      `${commenterDel.name} 获得 ${Math.round(yp.remainingSec)} 秒评论时间（来自 ${originalSeat?.name ?? yp.originalSeatId} 的让渡）`,
      { seatId: commenterDel.id }
    )
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

    const motionLabel =
      motion.type === 'moderated_caucus'
        ? `有主持核心磋商: ${(motion as any).topic}`
        : MOTION_LABELS[motion.type] ?? motion.type
    const proposer = this.getSeat(motion.proposedBySeatId)
    this.addConferenceEntry('motion_proposed', `${proposer?.name ?? motion.proposedBySeatId} 提出动议: ${motionLabel}`, {
      seatId: motion.proposedBySeatId,
      motionId: id
    })
    this.touch()
    return id
  }

  approveMotion(motionId: string): void {
    const motion = this.motions.find((m) => m.id === motionId)
    if (!motion) return

    const motionLabel =
      motion.type === 'moderated_caucus'
        ? `有主持核心磋商: ${(motion as any).topic}`
        : MOTION_LABELS[motion.type] ?? motion.type

    this.motions = this.motions.map((m) =>
      m.id === motionId ? { ...m, status: 'approved' as const } : m
    )
    this.addConferenceEntry('motion_approved', `动议通过: ${motionLabel}`, { motionId })
    this.executeMotionAction(motion)
    this.touch()
  }

  rejectMotion(motionId: string): void {
    const motion = this.motions.find((m) => m.id === motionId)
    const motionLabel = motion
      ? motion.type === 'moderated_caucus'
        ? `有主持核心磋商: ${(motion as any).topic}`
        : MOTION_LABELS[motion.type] ?? motion.type
      : motionId

    this.motions = this.motions.map((m) =>
      m.id === motionId ? { ...m, status: 'rejected' as const } : m
    )
    this.addConferenceEntry('motion_rejected', `动议未通过: ${motionLabel}`, { motionId })
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
      case 'individual_speech':
        this.startCaucusImpl(motion.id)
        break
    }
  }

  private executeOpenSpeakersList(): void {
    const now = Date.now()
    this.votingSessions = this.votingSessions.map((s) => (!s.endedAt ? { ...s, endedAt: now } : s))
    this.phase = 'general_debate'
    this.speakersListHasBeenPopulated = false
    this.addConferenceEntry('phase_changed', '进入阶段: 一般性辩论（主发言名单已开启）')
    this.touch()
  }

  private executeModeratedCaucusMotion(motion: Motion): void {
    if (this.activeSpeaker && !this.speakerList.current?.yield) {
      const entryId = this.activeSpeaker.entryId
      this.speakerList.remove(entryId)
      this.activeSpeaker = null
      this.addConferenceEntry('speaker_finished', '发言人时间作废（磋商动议通过）')
    }
    const proposerDelId = motion.proposedBySeatId
    this.phase = 'caucus_setup'
    this.caucusSetup = {
      motionId: motion.id,
      proposerPosition: 'first',
      speakerSeatIds: proposerDelId ? [proposerDelId] : []
    }
    const topic = (motion as any).topic
    this.addConferenceEntry('phase_changed', `进入阶段: 磋商准备${topic ? '（' + topic + '）' : ''}`)
    this.touch()
  }

  private executeModifySpeakingTime(motion: Motion): void {
    const newTime = (motion as any).newTimeSec as number
    this.defaultSpeakingTimeSec = newTime
    const list = this.speakerList
    list.entries = list.entries.map((s) =>
      s.status === 'waiting' || s.status === 'ready' ? { ...s, allocatedTimeSec: newTime } : s
    )
    this.addConferenceEntry('phase_changed', `发言时间已修改为 ${newTime} 秒`)
    this.touch()
  }

  private executeClosureDebate(): void {
    if (this.activeSpeaker) {
      this.activeSpeaker = null
    }
    if (this.activeCaucus) {
      this.activeCaucus = null
      this.addConferenceEntry('caucus_ended', '辩论结束，磋商终止')
    }
    this.phase = 'voting'
    this.addConferenceEntry('phase_changed', '进入阶段: 投票表决')
    this.touch()
  }

  private executeSubstantiveVote(motion: Motion): void {
    const docName = (motion as any).documentName as string
    if (docName) {
      this.addDocumentName(docName)
    }
    this.startVotingSession(
      'motion',
      motion.id,
      'two_thirds',
      `对「${docName || '未命名文件'}」开始实质性投票 (2/3多数)`
    )
  }

  /** 更改席位出席状态（统一入口：动议 & 直接管理均通过此方法） */
  changeSeatAttendance(
    seatId: string,
    newAttendance: Attendance,
    opts?: { silent?: boolean }
  ): void {
    this.setAttendance(seatId, newAttendance)
    const del = this.seats.find((d) => d.id === seatId)
    if (!opts?.silent) {
      const label = newAttendance === 'present' ? '出席' : '缺席'
      this.addConferenceEntry(
        'attendance_changed',
        `${del?.name ?? seatId} 出席状态变更为 ${label}`,
        { seatId }
      )
    }
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
    this.changeSeatAttendance(motion.proposedBySeatId, motion.newAttendance)
  }

  // ================================================================
  //  问题
  // ================================================================

  raisePoint(type: PointType, seatId: string): string {
    const id = generateId()
    const now = Date.now()
    const point: Point = { id, type, proposedBySeatId: seatId, proposedAt: now }

    this.points = [...this.points, point]

    // 程序性问题：若有活跃发言人且未暂停，则自动暂停计时器
    if (type === 'point_of_order' && this.activeSpeaker && !this.activeSpeaker.paused) {
      this.pauseSpeaking()
    }

    const del = this.seats.find((d) => d.id === seatId)
    const pointLabel = POINT_LABELS[point.type]
    this.addConferenceEntry('point_proposed', `${del?.name ?? seatId} 提出${pointLabel}`, {
      seatId
    })
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

    let totalSec = 0
    let caucusType: CaucusType = 'unmoderated'
    let topic: string | undefined

    if (motion.type === 'moderated_caucus') {
      caucusType = 'moderated'
      totalSec = (motion as any).totalTimeSec
      topic = (motion as any).topic
    } else if (motion.type === 'unmoderated_caucus') {
      caucusType = 'unmoderated'
      totalSec = (motion as any).durationSec
    } else if (motion.type === 'individual_speech') {
      caucusType = 'individual'
      totalSec = (motion as any).durationSec
    }

    this.phase = 'caucus'
    this.activeCaucus = { motionId, type: caucusType, totalSec, elapsedSec: 0, paused: false }

    const label =
      caucusType === 'moderated'
        ? '有主持核心磋商'
        : caucusType === 'individual'
          ? '个人演讲'
          : '自由磋商'
    const eventType = caucusType === 'individual' ? 'individual_speech_started' : 'caucus_started'
    this.addConferenceEntry(eventType, `${label}开始${topic ? ': ' + topic : ''}`, { motionId })
    this.addConferenceEntry('phase_changed', '进入阶段: 磋商')
    this.touch()
  }

  setCaucusProposerPosition(position: ProposerPosition): void {
    if (!this.caucusSetup) return
    const motion = this.motions.find((m) => m.id === this.caucusSetup!.motionId)
    const proposerId = motion?.proposedBySeatId
    if (!proposerId) {
      this.caucusSetup = { ...this.caucusSetup, proposerPosition: position }
      return
    }

    const ids = this.caucusSetup.speakerSeatIds.filter((id) => id !== proposerId)
    const reordered = position === 'first' ? [proposerId, ...ids] : [...ids, proposerId]
    this.caucusSetup = {
      ...this.caucusSetup,
      proposerPosition: position,
      speakerSeatIds: reordered
    }
  }

  addToCaucusSpeakersSetup(seatId: string): void {
    if (!this.caucusSetup) return
    if (this.caucusSetup.speakerSeatIds.includes(seatId)) return

    const motion = this.motions.find((m) => m.id === this.caucusSetup!.motionId)
    const proposerId = motion?.proposedBySeatId

    const ids = this.caucusSetup.speakerSeatIds
    const newIds =
      this.caucusSetup.proposerPosition === 'last' && proposerId
        ? [...ids.slice(0, -1), seatId, proposerId]
        : [...ids, seatId]

    const perSpeakerSec = (motion as any)?.speakingTimePerPersonSec ?? 60
    const totalSec = this.caucusSetup.remainingSec ?? (motion as any)?.totalTimeSec ?? 0
    const maxSpeakers = Math.floor(totalSec / perSpeakerSec)
    if (newIds.length > maxSpeakers) return

    this.caucusSetup = { ...this.caucusSetup, speakerSeatIds: newIds }
  }

  removeFromCaucusSpeakersSetup(seatId: string): void {
    if (!this.caucusSetup) return
    this.caucusSetup = {
      ...this.caucusSetup,
      speakerSeatIds: this.caucusSetup.speakerSeatIds.filter(
        (id) => id !== seatId
      )
    }
  }

  startCaucusWithSetup(): void {
    if (!this.caucusSetup) return

    const { motionId, speakerSeatIds, remainingSec } = this.caucusSetup
    const motion = this.motions.find((m) => m.id === motionId)
    if (!motion) return

    const perSpeakerSec = ((motion as any).speakingTimePerPersonSec as number) ?? 60
    const totalSec = remainingSec ?? ((motion as any).totalTimeSec as number)
    const topic = (motion as any).topic

    const maxSpeakers = Math.max(1, Math.floor(totalSec / perSpeakerSec))
    const trimmedIds = speakerSeatIds.slice(0, maxSpeakers)

    const caucusSpeakers: SpeakerEntry[] = trimmedIds.map((delId) => {
      const del = this.seats.find((d) => d.id === delId)
      return {
        id: generateId(),
        seatId: delId,
        allocatedTimeSec: perSpeakerSec,
        status: 'waiting' as const
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
      totalSec,
      elapsedSec: 0,
      paused: false,
      caucusSpeakers,
      currentSpeakerIndex: caucusSpeakers.length > 0 ? 0 : undefined
    }
    this.activeSpeaker = null

    const firstName = caucusSpeakers[0] ? this.getSpeakerSeatName(caucusSpeakers[0]) : ''
    this.addConferenceEntry(
      'caucus_started',
      `有主持核心磋商开始${topic ? ': ' + topic : ''}，首位发言人（就绪）: ${firstName}`,
      { motionId }
    )
    this.addConferenceEntry('phase_changed', '进入阶段: 磋商')
    this.touch()
  }

  /**
   * 移除发言人后的统一过渡逻辑。
   * 由 advanceCaucusSpeaker / cancelCaucusSpeaker 共用。
   */
  private transitionAfterCaucusSpeakerRemoved(
    updatedSpeakers: SpeakerEntry[],
    updatedCaucus: this['activeCaucus'] & {},
    totalRemaining: number,
    perSpeakerSec: number
  ): void {
    if (updatedSpeakers.length === 0) {
      if (totalRemaining >= perSpeakerSec) {
        const previousMotionId = updatedCaucus.motionId

        this.phase = 'caucus_setup'
        this.activeCaucus = null
        this.activeSpeaker = null

        this.caucusSetup = {
          motionId: previousMotionId,
          proposerPosition: 'first',
          speakerSeatIds: [],
          remainingSec: totalRemaining
        }

        this.addConferenceEntry('caucus_paused', '名单已走完，返回磋商准备以添加更多发言人')
        this.addConferenceEntry('phase_changed', '进入阶段: 磋商准备')
      } else {
        this.endCaucus()
      }

      this.touch()
      return
    }

    if (totalRemaining >= perSpeakerSec) {
      const nextSpeaker: SpeakerEntry = {
        ...updatedSpeakers[0],
        status: 'ready'
      }

      const nextName = this.getSpeakerSeatName(nextSpeaker)

      this.activeCaucus = {
        ...updatedCaucus,
        caucusSpeakers: [nextSpeaker, ...updatedSpeakers.slice(1)],
        currentSpeakerIndex: 0
      }

      this.activeSpeaker = null

      this.addConferenceEntry('speaker_ready', `${nextName} 准备发言（等待主席开始计时）`)
    } else {
      this.endCaucus()
    }

    this.touch()
  }

  advanceCaucusSpeaker(): void {
    const caucus = this.activeCaucus
    if (!caucus) return

    const speakers = caucus.caucusSpeakers ?? []
    const currentIdx = caucus.currentSpeakerIndex ?? -1

    // 先累计当前发言人的时间
    if (this.activeSpeaker) {
      this.activeCaucus = {
        ...caucus,
        elapsedSec: caucus.elapsedSec + this.activeSpeaker.elapsedSec
      }
    }

    const updatedCaucus = this.activeCaucus!
    const totalRemaining = updatedCaucus.totalSec - updatedCaucus.elapsedSec
    const motion = this.motions.find((m) => m.id === updatedCaucus.motionId) as any
    const perSpeakerSec = motion?.speakingTimePerPersonSec ?? 60

    // 删除当前发言人
    const updatedSpeakers =
      currentIdx >= 0 ? speakers.filter((_, i) => i !== currentIdx) : [...speakers]

    this.transitionAfterCaucusSpeakerRemoved(
      updatedSpeakers,
      updatedCaucus,
      totalRemaining,
      perSpeakerSec
    )
  }

  startCaucusSpeakerEntry(): void {
    if (!this.activeCaucus?.caucusSpeakers) return

    const speakers = this.activeCaucus.caucusSpeakers
    const readyIdx = speakers.findIndex((s) => s.status === 'ready')
    if (readyIdx < 0) return

    const readySpeaker = speakers[readyIdx]
    const perSpeakerSec = readySpeaker.allocatedTimeSec

    const updatedSpeakers = speakers.map((s, i) =>
      i === readyIdx ? { ...s, status: 'speaking' as const } : s
    )

    this.activeCaucus = {
      ...this.activeCaucus,
      caucusSpeakers: updatedSpeakers,
      currentSpeakerIndex: readyIdx
    }
    this.activeSpeaker = {
      entryId: readySpeaker.seatId,
      totalSec: perSpeakerSec,
      elapsedSec: 0,
      paused: false
    }

    const speakerName = this.getSpeakerSeatName(readySpeaker)
    this.addConferenceEntry('speaker_started', `${speakerName} 开始发言 (${perSpeakerSec}秒)`)
    this.touch()
  }

  appendCaucusSpeaker(seatId: string): void {
    if (!this.activeCaucus?.caucusSpeakers) return

    const currentSpeakers = this.activeCaucus.caucusSpeakers
    if (currentSpeakers.some((s) => s.seatId === seatId)) return

    const del = this.seats.find((d) => d.id === seatId)
    const motion = this.motions.find((m) => m.id === this.activeCaucus!.motionId) as any
    const perSpeakerSec = motion?.speakingTimePerPersonSec ?? 60

    const totalRemaining = this.activeCaucus.totalSec - this.activeCaucus.elapsedSec
    const futureCount = currentSpeakers.length + 1
    if (futureCount * perSpeakerSec > totalRemaining) return

    const newSpeaker: SpeakerEntry = {
      id: generateId(),
      seatId,
      allocatedTimeSec: perSpeakerSec,
      status: 'waiting' as const
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
      this.addConferenceEntry(
        'speaker_ready',
        `${del?.name ?? seatId} 准备发言（等待主席开始计时）`
      )
    }
    this.touch()
  }

  /** 取消 ready 状态的发言人（移出队列并自动推进到下一位） */
  cancelCaucusSpeaker(): void {
    const caucus = this.activeCaucus
    if (!caucus?.caucusSpeakers) return

    const speakers = caucus.caucusSpeakers
    const readyIdx = speakers.findIndex((s) => s.status === 'ready')
    if (readyIdx < 0) return

    const speaker = speakers[readyIdx]
    const updatedSpeakers = speakers.filter((_, i) => i !== readyIdx)

    const totalRemaining = caucus.totalSec - caucus.elapsedSec
    const motion = this.motions.find((m) => m.id === caucus.motionId) as any
    const perSpeakerSec = motion?.speakingTimePerPersonSec ?? 60

    this.addConferenceEntry(
      'speaker_cancelled',
      `取消 ${this.getSpeakerSeatName(speaker)} 的准备状态`
    )

    this.transitionAfterCaucusSpeakerRemoved(
      updatedSpeakers,
      caucus,
      totalRemaining,
      perSpeakerSec
    )
  }

  pauseCaucus(): void {
    if (!this.activeCaucus) return
    this.activeCaucus = { ...this.activeCaucus, paused: true }
    this.touch()
  }

  resumeCaucus(_remainingSec?: number): void {
    if (!this.activeCaucus) return
    this.activeCaucus = { ...this.activeCaucus, paused: false }
    this.touch()
  }

  endCaucus(): void {
    const caucusType = this.activeCaucus?.type
    this.phase = 'general_debate'
    this.activeCaucus = null
    const eventType =
      caucusType === 'individual' ? 'individual_speech_ended' : 'caucus_ended'
    const label = caucusType === 'individual' ? '个人演讲结束' : '磋商结束'
    this.addConferenceEntry(eventType, label)
    this.addConferenceEntry('phase_changed', '进入阶段: 一般性辩论')
    this.touch()
  }

  // ================================================================
  //  投票
  // ================================================================

  startVotingSession(
    targetType: VoteTargetType,
    targetId: string,
    majorityRule: MajorityRule,
    descriptionOverride?: string
  ): string {
    const id = generateId()

    const presentSeats = this.participantSeats
      .filter((seat) => seat.procedure.attendance === 'present' && seat.procedure.hasVotingRights)
      .sort((a, b) => a.procedure.sortOrder - b.procedure.sortOrder)
    const firstSeatId = presentSeats[0]?.id ?? null

    const session: VotingSession = {
      id,
      targetType,
      targetId,
      majorityRule,
      ballots: [],
      startedAt: Date.now(),
      currentSeatId: firstSeatId,
      round: 1
    }

    this.phase = 'voting'
    this.votingSessions = [...this.votingSessions, session]

    const desc = descriptionOverride ?? `开始投票表决 (${majorityRule === 'simple_majority' ? '简单多数' : '2/3多数'})`
    this.addConferenceEntry('voting_started', desc)
    this.addConferenceEntry('phase_changed', '进入阶段: 投票表决')
    this.touch()
    return id
  }

  castVote(sessionId: string, seatId: string, vote: 'yes' | 'no' | 'abstain' | 'skip'): void {
    const sessionIdx = this.votingSessions.findIndex((s) => s.id === sessionId)
    if (sessionIdx < 0) return

    const session = this.votingSessions[sessionIdx]
    if (session.currentSeatId !== seatId) {
      console.warn(
        `castVote: seat ${seatId} is not the current voter (current=${session.currentSeatId})`
      )
      return
    }

    if (session.round >= 2 && (vote === 'abstain' || vote === 'skip')) {
      console.warn(`castVote: round ${session.round} does not allow ${vote}`)
      return
    }

    const existing = session.ballots.findIndex((b) => b.seatId === seatId)
    const newBallot: VoteBallot = { seatId, vote }
    let ballots: VoteBallot[]
    if (existing >= 0) {
      ballots = session.ballots.map((b, i) => (i === existing ? newBallot : b))
    } else {
      ballots = [...session.ballots, newBallot]
    }

    const presentSeats = this.participantSeats
      .filter((seat) => seat.procedure.attendance === 'present' && seat.procedure.hasVotingRights)
      .sort((a, b) => a.procedure.sortOrder - b.procedure.sortOrder)

    const { nextSeatId, nextRound } = this.advanceVoting(
      session.round,
      seatId,
      ballots,
      presentSeats
    )

    this.votingSessions = this.votingSessions.map((s, i) =>
      i === sessionIdx
        ? { ...s, ballots, currentSeatId: nextSeatId, round: nextRound }
        : s
    )
    this.touch()
  }

  private advanceVoting(
    currentRound: number,
    justVotedSeatId: string,
    ballots: VoteBallot[],
    presentSeats: ParticipantSeat[]
  ): { nextSeatId: string | null; nextRound: number } {
    if (currentRound === 1) {
      const currentIdx = presentSeats.findIndex((d) => d.id === justVotedSeatId)
      const nextSeat = presentSeats[currentIdx + 1]
      if (nextSeat) {
        return { nextSeatId: nextSeat.id, nextRound: 1 }
      }
      const skippedIds = new Set(
        ballots.filter((b) => b.vote === 'skip').map((b) => b.seatId)
      )
      if (skippedIds.size > 0) {
        const firstSkipped = presentSeats.find((d) => skippedIds.has(d.id))
        return { nextSeatId: firstSkipped?.id ?? null, nextRound: 2 }
      }
      return { nextSeatId: null, nextRound: 1 }
    }

    const skippedSeats = presentSeats.filter((d) => {
      const ballot = ballots.find((b) => b.seatId === d.id)
      return ballot?.vote === 'skip'
    })
    const currentSkippedIdx = skippedSeats.findIndex((d) => d.id === justVotedSeatId)
    const nextSkipped = skippedSeats[currentSkippedIdx + 1]
    if (nextSkipped) {
      return { nextSeatId: nextSkipped.id, nextRound: 2 }
    }
    return { nextSeatId: null, nextRound: 2 }
  }

  closeVotingSession(sessionId: string): void {
    const sessionIdx = this.votingSessions.findIndex((s) => s.id === sessionId)
    if (sessionIdx < 0) return

    const session = this.votingSessions[sessionIdx]
    if (session.currentSeatId !== null) {
      console.warn('closeVotingSession: not all seats have voted yet')
      return
    }

    const { yes, no, abstain } = tallyVotesEngine(session.ballots)
    // 仅统计拥有投票权的出席代表（排除观察员）
    const presentCount = this.participantSeats.filter(
      (seat) => seat.procedure.attendance === 'present' && seat.procedure.hasVotingRights
    ).length
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
          this.addConferenceEntry('phase_changed', '主发言名单已结束')
        } else {
          const motionStatus: 'approved' | 'rejected' =
            result === 'passed' ? 'approved' : 'rejected'
          newMotions = this.motions.map((m) =>
            m.id === session.targetId ? { ...m, status: motionStatus } : m
          )

          if (result === 'passed') {
            if (motion.type === 'suspend_meeting') {
              newPhase = 'suspended'
              newActiveSpeaker = null
              newActiveCaucus = null
              this.addConferenceEntry('meeting_suspended', '暂时休会')
              this.addConferenceEntry('phase_changed', '进入阶段: 休会')
            } else if (motion.type === 'close_meeting') {
              newPhase = 'closed'
              newActiveSpeaker = null
              newActiveCaucus = null
              this.addConferenceEntry('meeting_closed', '会议闭幕')
              this.addConferenceEntry('phase_changed', '进入阶段: 闭幕')
            } else if (motion.type === 'closure_debate') {
              newPhase = 'voting'
              newActiveSpeaker = null
              newActiveCaucus = null
              this.addConferenceEntry('phase_changed', '进入阶段: 投票表决')
            } else if (motion.type === 'unmoderated_caucus') {
              const durationSec = (motion as any).durationSec as number
              newPhase = 'caucus'
              newActiveSpeaker = null
              newActiveCaucus = {
                motionId: motion.id,
                type: 'unmoderated',
                totalSec: durationSec,
                elapsedSec: 0,
                paused: false
              }
              this.addConferenceEntry('caucus_started', '自由磋商开始')
              this.addConferenceEntry('phase_changed', '进入阶段: 磋商')
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

    this.addConferenceEntry(
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
    this.addConferenceEntry('resolution_introduced', `决议草案提交: ${title}`, { resolutionId: id })
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
    this.addConferenceEntry('meeting_suspended', '暂时休会')
    this.addConferenceEntry('phase_changed', '进入阶段: 休会')
    this.touch()
  }

  resumeMeeting(): void {
    this.phase = 'pending_speakers_list'
    this.addConferenceEntry('meeting_resumed', '会议恢复')
    this.addConferenceEntry('phase_changed', '进入阶段: 等待开启主发言名单')
    this.touch()
  }

  closeMeeting(): void {
    this.phase = 'closed'
    this.activeSpeaker = null
    this.activeCaucus = null
    this.addConferenceEntry('meeting_closed', '会议闭幕')
    this.addConferenceEntry('phase_changed', '进入阶段: 闭幕')
    this.touch()
  }

  setPhase(phase: ConferencePhase): void {
    this.phase = phase
    this.touch()
  }

  // ================================================================
  //  会议记录
  // ================================================================

  /**
   * ConferenceActionType → ServiceEventType 映射。
   * 每条日志记录自动触发对应的插件服务事件，确保日志和事件通知始终同步。
   */
  private static readonly CONFERENCE_ACTION_TO_SERVICE_EVENT: Partial<Record<ConferenceActionType, string>> = {
    roll_call_completed: 'conference:roll_call_completed',
    speaker_started: 'conference:speaker_started',
    speaker_finished: 'conference:speaker_finished',
    motion_proposed: 'conference:motion_proposed',
    motion_approved: 'conference:motion_approved',
    voting_started: 'conference:voting_started',
    voting_ended: 'conference:voting_ended',
    caucus_started: 'conference:caucus_started',
    caucus_ended: 'conference:caucus_ended',
    individual_speech_started: 'conference:individual_speech_started',
    individual_speech_ended: 'conference:individual_speech_ended',
    meeting_suspended: 'conference:meeting_suspended',
    meeting_resumed: 'conference:meeting_resumed',
    meeting_closed: 'conference:meeting_closed',
    phase_changed: 'conference:phase_changed'
  }

  addConferenceEntry(
    actionType: ConferenceActionType,
    description: string,
    related?: {
      seatId?: string
      motionId?: string
      resolutionId?: string
    }
  ): void {
    const entry: ConferenceEntry = {
      id: generateId(),
      timestamp: Date.now(),
      actionType,
      description,
      ...related
    }
    this.minutes = [...this.minutes, entry]

    // 自动触发对应的插件服务事件（与日志写入同一调用点，确保同步）
    const serviceEventType = Committee.CONFERENCE_ACTION_TO_SERVICE_EVENT[actionType]
    if (serviceEventType) {
      emitServiceEvent(serviceEventType, this.buildEventContext())
    }
  }

  /** 构建插件事件上下文数据 */
  private buildEventContext(): Record<string, unknown> {
    const speakerEntry = this.activeSpeaker
      ? this.speakerList.entries.find((s) => s.id === this.activeSpeaker!.entryId)
      : null
    const speakerSeat = speakerEntry
      ? this.seats.find((d) => d.id === speakerEntry.seatId)
      : null

    return {
      conferenceId: this.id,
      conferenceName: this.name,
      phase: this.phase,
      presentCount: this.getPresentCount(),
      votingCount: this.getVotingCount(),
      currentSpeaker: this.activeSpeaker && speakerSeat
        ? {
            seatId: speakerSeat.id,
            seatName: speakerSeat.name,
            remainingTimeSec: Math.max(0, this.activeSpeaker.totalSec - this.activeSpeaker.elapsedSec)
          }
        : null,
      activeCaucusType: this.activeCaucus?.type ?? null,
      activeCaucusMotionId: this.activeCaucus?.motionId ?? null
    }
  }

  // ================================================================
  //  投票统计（纯函数，代理到引擎函数）
  // ================================================================

  tallyVotes(ballots: VoteBallot[]): { yes: number; no: number; abstain: number } {
    return tallyVotesEngine(ballots)
  }

  getPresentCount(): number {
    return this.participantSeats.filter((seat) => seat.procedure.attendance === 'present').length
  }

  /** 拥有投票权的出席代表人数（排除观察员） */
  getVotingCount(): number {
    return this.participantSeats.filter(
      (seat) => seat.procedure.attendance === 'present' && seat.procedure.hasVotingRights
    ).length
  }

  getSimpleMajorityThreshold(): number {
    return Math.floor(this.getVotingCount() / 2) + 1
  }

  getTwoThirdsThreshold(): number {
    return Math.ceil((this.getVotingCount() * 2) / 3)
  }

  getMajorityThresholds() {
    return calculateMajorityThresholds(this.participantSeats)
  }

  // ================================================================
  //  序列化
  // ================================================================

  toJSON(): CommitteeDTO {
    return {
      id: this.id,
      name: this.name,
      phase: this.phase,
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
            caucusSpeakers: this.activeCaucus.caucusSpeakers
          }
        : null,
      activeSpeaker: this.activeSpeaker,
      yieldPending: this.yieldPending,
      seats: this.seats
    }
  }

  static fromJSON(json: CommitteeDTO): Committee {
    const cleanJson = { ...json }

    // 清理已过期的计时器状态
    if (
      cleanJson.activeSpeaker &&
      cleanJson.activeSpeaker.elapsedSec >= cleanJson.activeSpeaker.totalSec
    ) {
      const expiredEntryId = cleanJson.activeSpeaker.entryId
      if (cleanJson.speakerLists?.entries) {
        cleanJson.speakerLists = {
          ...cleanJson.speakerLists,
          entries: cleanJson.speakerLists.entries.filter((s) => s.id !== expiredEntryId)
        }
      }
      cleanJson.activeSpeaker = null
    }
    if (
      cleanJson.activeCaucus &&
      cleanJson.activeCaucus.elapsedSec >= cleanJson.activeCaucus.totalSec
    ) {
      cleanJson.activeCaucus = null
    }

    return new Committee(cleanJson)
  }

  // ================================================================
  //  工具
  // ================================================================

  /**
   * 通过 seatId 查表获取席位名称。
   */
  getSpeakerSeatName(entry: { seatId: string }): string {
    return this.seats.find((d) => d.id === entry.seatId)?.name ?? entry.seatId
  }

  /** 状态已通过 store 的 syncEngine 统一写入所属大会。 */
  private touch(): void {}

  // ================================================================
  //  委员会席位管理
  // ================================================================

  addSeat(
    name: string,
    seatGroupId: string,
    role?: string,
    capabilityOverrides: Partial<Record<Capability, boolean>> = {},
    procedure?: Seat['procedure']
  ): string {
    const id = generateId()
    const seat: Seat = {
      id,
      name,
      seatGroupId,
      capabilityOverrides,
      role,
      procedure
    }
    this.seats = [...this.seats, seat]
    this.addConferenceEntry('phase_changed', `席位已创建: ${name}`)
    this.touch()
    return id
  }

  updateSeat(id: string, updates: Partial<Seat>): void {
    this.seats = this.seats.map((seat) => {
      if (seat.id !== id) return seat
      return { ...seat, ...updates }
    })
    this.touch()
  }

  getSeat(id: string): Seat | undefined {
    return this.seats.find((s) => s.id === id)
  }

  // ================================================================
  //  生命周期
  // ================================================================

  /** 销毁引擎：停止所有 timer */
  destroy(): void {
    for (const timer of this.timers.values()) {
      timer.stop()
    }
    this.timers.clear()
  }
}
