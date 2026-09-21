// ============================================================
// committee.ts - Committee procedure domain contracts
// ============================================================

import type { Attendance, Seat } from './delegate'
import type {
  ConferenceActionType,
  Entry,
  ConferenceEntry
} from '../../../../../shared/action-types'
import { ACTION_LABELS } from '../../../../../shared/action-types'

export type { Attendance, ParticipantSeat, Seat, SeatView } from './delegate'
export type { ConferenceActionType, Entry, ConferenceEntry }
export { ACTION_LABELS }

export type ConferencePhase =
  | 'preamble'
  | 'roll_call'
  | 'pending_speakers_list'
  | 'general_debate'
  | 'caucus'
  | 'voting'
  | 'caucus_setup'
  | 'suspended'
  | 'closed'

export interface AgendaItem {
  id: string
  title: string
  description?: string
  sortOrder: number
}

export type YieldType = 'chair' | 'delegate' | 'question' | 'comment'

export type SpeakerEntryStatus = 'waiting' | 'ready' | 'speaking' | 'finished' | 'interrupted'

export type CaucusSpeakerStatus = 'waiting' | 'ready' | 'speaking'

export interface YieldChoice {
  type: YieldType
  seatId?: string
  fromSeatId?: string
}

export interface YieldPendingState {
  originalEntryId: string
  originalSeatId: string
  yieldType: YieldType
  remainingSec: number
  allocatedSec: number
  questionerSeatId?: string
}

export interface SpeakerEntry {
  id: string
  seatId: string
  allocatedTimeSec: number
  remainingTimeSec?: number
  status: SpeakerEntryStatus
  yield?: YieldChoice
  canYield?: boolean
}

export interface SpeakerDisplayEntry {
  id: string
  seatId: string
  seatName: string
  status: string
  allocatedTimeSec: number
}

export interface SpeakerListData {
  id: string
  name: string
  entries: SpeakerEntry[]
}

export type PointType = 'point_of_order' | 'point_of_inquiry' | 'point_of_personal_privilege'

export const POINT_LABELS: Record<PointType, string> = {
  point_of_order: '程序性问题',
  point_of_inquiry: '咨询性问题',
  point_of_personal_privilege: '个人特权问题'
}

export type MotionType =
  | 'open_speakers_list'
  | 'moderated_caucus'
  | 'unmoderated_caucus'
  | 'modify_speaking_time'
  | 'postpone_resolution'
  | 'resume_resolution'
  | 'closure_debate'
  | 'suspend_meeting'
  | 'close_meeting'
  | 'reorder_resolution'
  | 'substantive_vote'
  | 'change_attendance'
  | 'individual_speech'

export type MotionStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface AbstractMotion {
  id: string
  type: MotionType
  proposedBySeatId: string
  proposedAt: number
  status: MotionStatus
}

export interface OpenSpeakersListMotion extends AbstractMotion {
  type: 'open_speakers_list'
}

export interface ModeratedCaucusMotion extends AbstractMotion {
  type: 'moderated_caucus'
  topic: string
  totalTimeSec: number
  speakingTimePerPersonSec: number
  maxSpeakers: number
}

export interface UnmoderatedCaucusMotion extends AbstractMotion {
  type: 'unmoderated_caucus'
  durationSec: number
}

export interface ModifySpeakingTimeMotion extends AbstractMotion {
  type: 'modify_speaking_time'
  newTimeSec: number
}

export interface PostponeResolutionMotion extends AbstractMotion {
  type: 'postpone_resolution'
  agendaItemId: string
}

export interface ResumeResolutionMotion extends AbstractMotion {
  type: 'resume_resolution'
  agendaItemId: string
}

export interface ClosureDebateMotion extends AbstractMotion {
  type: 'closure_debate'
}

export interface SuspendMeetingMotion extends AbstractMotion {
  type: 'suspend_meeting'
}

export interface CloseMeetingMotion extends AbstractMotion {
  type: 'close_meeting'
}

export interface ReorderResolutionMotion extends AbstractMotion {
  type: 'reorder_resolution'
  newOrder: string[]
}

export interface SubstantiveVoteMotion extends AbstractMotion {
  type: 'substantive_vote'
  documentName: string
}

export interface ChangeAttendanceMotion extends AbstractMotion {
  type: 'change_attendance'
  newAttendance: Attendance
}

export interface IndividualSpeechMotion extends AbstractMotion {
  type: 'individual_speech'
  durationSec: number
}

export type Motion =
  | OpenSpeakersListMotion
  | ModeratedCaucusMotion
  | UnmoderatedCaucusMotion
  | ModifySpeakingTimeMotion
  | PostponeResolutionMotion
  | ResumeResolutionMotion
  | ClosureDebateMotion
  | SuspendMeetingMotion
  | CloseMeetingMotion
  | ReorderResolutionMotion
  | SubstantiveVoteMotion
  | ChangeAttendanceMotion
  | IndividualSpeechMotion

export const MOTION_LABELS: Record<MotionType, string> = {
  open_speakers_list: '开启主发言名单',
  moderated_caucus: '有主持核心磋商',
  unmoderated_caucus: '自由磋商',
  modify_speaking_time: '修改发言时间',
  postpone_resolution: '延置决议草案',
  resume_resolution: '恢复决议草案',
  closure_debate: '结束辩论',
  suspend_meeting: '暂时休会',
  close_meeting: '闭幕',
  reorder_resolution: '调整投票顺序',
  substantive_vote: '实质性投票',
  change_attendance: '更改出席状态',
  individual_speech: '个人演讲'
}

export interface Point {
  id: string
  type: PointType
  proposedBySeatId: string
  proposedAt: number
}

export interface DraftResolution {
  id: string
  title: string
  sponsors: string[]
  signatories: string[]
  content: string
  agendaItemId?: string
  createdAt: number
}

export type VoteValue = 'yes' | 'no' | 'abstain' | 'skip'
export type MajorityRule = 'simple_majority' | 'two_thirds'
export type VoteTargetType = 'motion' | 'resolution'

export interface VoteBallot {
  seatId: string
  vote: VoteValue
}

export interface VotingSession {
  id: string
  targetType: VoteTargetType
  targetId: string
  majorityRule: MajorityRule
  ballots: VoteBallot[]
  startedAt: number
  endedAt?: number
  result?: 'passed' | 'failed'
  currentSeatId: string | null
  round: number
}

export interface MajorityThresholds {
  presentCount: number
  votingCount: number
  totalCount: number
  simpleMajorityThreshold: number
  twoThirdsThreshold: number
}

export type ProposerPosition = 'first' | 'last'
export type CaucusType = 'moderated' | 'unmoderated' | 'individual'

export interface Committee {
  id: string
  name: string
  phase: ConferencePhase
  agenda: AgendaItem[]
  seats: Seat[]
  speakerLists?: SpeakerListData
  motions: Motion[]
  dismissedResolvedMotionIds: string[]
  points: Point[]
  dismissedPointIds: string[]
  draftResolutions: DraftResolution[]
  documentNames: string[]
  votingSessions: VotingSession[]
  minutes: ConferenceEntry[]
  defaultSpeakingTimeSec: number
  caucusSetup?: {
    motionId: string
    proposerPosition: ProposerPosition
    speakerSeatIds: string[]
    remainingSec?: number
  } | null
  activeCaucus?: {
    motionId: string
    type: CaucusType
    totalSec: number
    elapsedSec: number
    paused: boolean
    updatedAt?: number
    caucusSpeakers?: SpeakerEntry[]
    currentSpeakerIndex?: number
  } | null
  activeSpeaker?: {
    entryId: string
    totalSec: number
    elapsedSec: number
    paused: boolean
  } | null
  yieldPending?: YieldPendingState | null
}
