/**
 * conference-engine.ts
 * ──────────────────────────────────────────────
 * 模拟大会引擎：状态机、投票计算、计时器。
 * 与 simulation-engine.ts 不同，这是事件驱动而非 RAF 帧驱动。
 */

import type {
  Conference,
  ConferencePhase,
  Delegation,
  VoteBallot,
  Motion,
  MotionType
} from '$lib/types-conference'

// ---- 阶段状态机 ----------------------------------------------------------

export const VALID_TRANSITIONS: Record<ConferencePhase, ConferencePhase[]> = {
  preamble: ['roll_call'],
  roll_call: ['general_debate', 'preamble'],
  general_debate: ['caucus', 'voting', 'suspended', 'closed'],
  caucus: ['general_debate', 'caucus', 'voting', 'suspended', 'closed'],
  voting: ['general_debate', 'caucus', 'voting', 'suspended', 'closed'],
  suspended: ['general_debate', 'closed'],
  closed: []
}

export function canTransition(from: ConferencePhase, to: ConferencePhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function transitionPhase(
  _conf: Conference,
  from: ConferencePhase,
  to: ConferencePhase
): ConferencePhase | Error {
  if (!canTransition(from, to)) {
    return new Error(`非法阶段转换: ${from} → ${to}`)
  }
  return to
}

// ---- 阶段中文标签 ---------------------------------------------------------

export const PHASE_LABELS: Record<ConferencePhase, string> = {
  preamble: '会前准备',
  roll_call: '点名',
  general_debate: '一般性辩论',
  caucus: '磋商',
  voting: '投票表决',
  motion: '动议',
  caucus_setup: '磋商准备',
  suspended: '休会',
  closed: '闭幕'
}

// ---- 投票计算（纯函数）----------------------------------------------------

export interface MajorityThresholds {
  presentCount: number
  totalCount: number
  simpleMajorityThreshold: number
  twoThirdsThreshold: number
}

export function calculateMajorityThresholds(delegations: Delegation[]): MajorityThresholds {
  const presentCount = delegations.filter(
    (d) => d.attendance === 'present' || d.attendance === 'present_and_voting'
  ).length
  return {
    presentCount,
    totalCount: delegations.length,
    simpleMajorityThreshold: Math.floor(presentCount / 2) + 1,
    twoThirdsThreshold: Math.ceil(presentCount * 2 / 3)
  }
}

export function determinePassFail(
  ballots: VoteBallot[],
  majorityRule: 'simple_majority' | 'two_thirds',
  delegations: Delegation[]
): 'passed' | 'failed' {
  const { presentCount, simpleMajorityThreshold, twoThirdsThreshold } =
    calculateMajorityThresholds(delegations)

  let yesCount = 0
  for (const b of ballots) {
    if (b.vote === 'yes') yesCount++
  }

  const threshold =
    majorityRule === 'simple_majority' ? simpleMajorityThreshold : twoThirdsThreshold

  return yesCount >= threshold ? 'passed' : 'failed'
}

/** 检查是否有否决权国家投了反对票 */
export function checkVeto(ballots: VoteBallot[], delegations: Delegation[]): boolean {
  const vetoDelegationIds = new Set(
    delegations.filter((d) => d.vetoPower).map((d) => d.id)
  )
  return ballots.some(
    (b) => vetoDelegationIds.has(b.delegationId) && b.vote === 'no'
  )
}

/** 纯函数：统计投票 */
export function tallyVotesEngine(ballots: VoteBallot[]): {
  yes: number
  no: number
  abstain: number
} {
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

// ---- 动议裁决 ------------------------------------------------------------

export interface MotionResolution {
  requiresVoting: boolean
  votingMajority: 'simple_majority' | 'two_thirds'
  autoApprove: boolean
}

/**
 * 判断动议是否需要表决，以及需要什么样的多数。
 * 遵循标准 MUN 议事规则。
 */
export function resolveMotion(motionType: MotionType): MotionResolution {
  switch (motionType) {
    // 需要简单多数表决
    case 'moderated_caucus':
    case 'modify_speaking_time':
    case 'suspend_meeting':
      return { requiresVoting: true, votingMajority: 'simple_majority', autoApprove: false }

    // 需要 2/3 多数表决
    case 'closure_debate':
    case 'close_meeting':
    case 'postpone_resolution':
    case 'reorder_resolution':
      return { requiresVoting: true, votingMajority: 'two_thirds', autoApprove: false }

    // 无需表决，自动通过
    case 'open_speakers_list':
    case 'unmoderated_caucus':
    case 'resume_resolution':
      return { requiresVoting: false, votingMajority: 'simple_majority', autoApprove: true }

    default:
      return { requiresVoting: true, votingMajority: 'simple_majority', autoApprove: false }
  }
}

// ---- 计时器 --------------------------------------------------------------

let _speakerTimerId: ReturnType<typeof setInterval> | null = null
let _caucusTimerId: ReturnType<typeof setInterval> | null = null
let _speakerRemainingSec = 0

export interface TimerTickData {
  remainingSec: number
  elapsedSec: number
  totalSec: number
}

/**
 * 启动发言计时器。每 100ms tick 一次。
 * @param remainingSec 剩余时间（秒）
 * @param onTick 每次回调（传入剩余秒数等）
 * @param onExpire 时间耗尽回调
 */
export function startSpeakerTimer(
  remainingSec: number,
  onTick: (data: TimerTickData) => void,
  onExpire: () => void
): void {
  stopSpeakerTimer()

  const startedAt = Date.now()
  const initialRemaining = remainingSec
  _speakerRemainingSec = remainingSec

  _speakerTimerId = setInterval(() => {
    const elapsedSec = (Date.now() - startedAt) / 1000
    _speakerRemainingSec = Math.max(0, initialRemaining - elapsedSec)

    onTick({
      remainingSec: _speakerRemainingSec,
      elapsedSec: Math.min(initialRemaining, elapsedSec),
      totalSec: initialRemaining
    })

    if (_speakerRemainingSec <= 0) {
      stopSpeakerTimer()
      onExpire()
    }
  }, 100)
}

export function pauseSpeakerTimer(): number {
  if (_speakerTimerId !== null) {
    clearInterval(_speakerTimerId)
    _speakerTimerId = null
  }
  return _speakerRemainingSec
}

export function resumeSpeakerTimer(
  onTick: (data: TimerTickData) => void,
  onExpire: () => void
): void {
  if (_speakerRemainingSec <= 0) return
  startSpeakerTimer(_speakerRemainingSec, onTick, onExpire)
}

export function stopSpeakerTimer(): void {
  if (_speakerTimerId !== null) {
    clearInterval(_speakerTimerId)
    _speakerTimerId = null
  }
  _speakerRemainingSec = 0
}

/**
 * 启动磋商计时器。每 1s tick 一次。
 */
export function startCaucusTimer(
  totalSec: number,
  onTick: (data: TimerTickData) => void,
  onExpire: () => void
): void {
  stopCaucusTimer()

  const startedAt = Date.now()
  const totalMs = totalSec * 1000

  _caucusTimerId = setInterval(() => {
    const elapsedMs = Date.now() - startedAt
    const remainingSec = Math.max(0, (totalMs - elapsedMs) / 1000)
    const elapsedSec = Math.min(totalSec, elapsedMs / 1000)

    onTick({
      remainingSec,
      elapsedSec,
      totalSec
    })

    if (remainingSec <= 0) {
      stopCaucusTimer()
      onExpire()
    }
  }, 1000)
}

export function stopCaucusTimer(): void {
  if (_caucusTimerId !== null) {
    clearInterval(_caucusTimerId)
    _caucusTimerId = null
  }
}

export function stopAllTimers(): void {
  stopSpeakerTimer()
  stopCaucusTimer()
}

// ---- 有主持磋商：计算最大发言人数 ------------------------------------------

export function calcMaxSpeakers(totalTimeSec: number, speakingTimePerPersonSec: number): number {
  if (speakingTimePerPersonSec <= 0) return 0
  return Math.floor(totalTimeSec / speakingTimePerPersonSec)
}

// ---- 格式化工秒为 mm:ss ----------------------------------------------------

export function formatTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.floor(Math.max(0, seconds) % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
