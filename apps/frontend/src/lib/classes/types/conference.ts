// ============================================================
// conference.ts - Conference aggregate DTO
// ============================================================

import type { SeatAccess, User, News, SeatGroup, SituationUpdate } from './delegate'
import type { RoleTemplate } from './event'
import type { Committee } from './committee'
import { ACTION_LABELS } from '../../../../../shared/action-types'
import { MOTION_LABELS, POINT_LABELS } from './committee'

export type { Attendance, ParticipantSeat, Seat, SeatView } from './delegate'

// Temporary compatibility exports while callers migrate to domain modules.
export type {
  AbstractMotion,
  AgendaItem,
  CaucusSpeakerStatus,
  CaucusType,
  Committee,
  ConferenceActionType,
  ConferencePhase,
  ConferenceEntry,
  DraftResolution,
  Entry,
  IndividualSpeechMotion,
  MajorityRule,
  MajorityThresholds,
  ModifySpeakingTimeMotion,
  Motion,
  MotionStatus,
  MotionType,
  OpenSpeakersListMotion,
  ChangeAttendanceMotion,
  CloseMeetingMotion,
  ClosureDebateMotion,
  ModeratedCaucusMotion,
  PostponeResolutionMotion,
  Point,
  PointType,
  ProposerPosition,
  ReorderResolutionMotion,
  ResumeResolutionMotion,
  SpeakerDisplayEntry,
  SpeakerEntry,
  SpeakerEntryStatus,
  SpeakerListData,
  SubstantiveVoteMotion,
  SuspendMeetingMotion,
  UnmoderatedCaucusMotion,
  VoteBallot,
  VoteTargetType,
  VoteValue,
  VotingSession,
  YieldChoice,
  YieldPendingState,
  YieldType
} from './committee'

export type {
  ConferenceDisplayData,
  ConferenceDisplaySpeaker,
  MotionDraft,
  SpeakerTransitionReason
} from './committee-display'
export type { TimerStatus, TimerTickData, TimerTickStatus } from './timer'

// Runtime labels remain exported for existing callers.
export { ACTION_LABELS, MOTION_LABELS, POINT_LABELS }

/** Conference aggregate: conference-level resources plus its committees. */
export interface Conference {
  id: string
  name: string
  description?: string
  organizer?: string
  createdAt: number
  updatedAt: number
  committees: Committee[]
  users: User[]
  seatAccesses: SeatAccess[]
  roleTemplates: RoleTemplate[]
  seatGroups: SeatGroup[]
  news: News[]
  situationUpdates: SituationUpdate[]
  timelineId?: string | null
}
