/** Typed wire contract between Host Service and UserClient/Host Console. */

import type {
  AuthenticatedSeatSession,
  Capability,
  ChairCommitteeProjection,
  Directive,
  News,
  SituationUpdate,
  UserClientSessionProjection,
  WorkflowAudienceProjection
} from './content-types'

export type ClientKind = 'user_client' | 'host_console'

export interface RequestContext {
  requestId: string
  /** Every state-changing UserClient request must include this key. */
  idempotencyKey?: string
}

export interface AuthenticateUserClientCommand {
  type: 'authenticate_user_client'
  inviteCode: string
  password?: string
}

export interface StartConferenceCommand {
  type: 'start_conference'
  conferenceId: string
}

export interface StopConferenceCommand {
  type: 'stop_conference'
}

export interface SubmitDirectiveCommand {
  type: 'submit_directive'
  title: string
  content: string
  targetCommitteeId: string
}

export interface ClaimDirectiveCommand {
  type: 'claim_directive'
  directiveId: string
}

export interface ApproveDirectiveCommand {
  type: 'approve_directive'
  directiveId: string
  processingNote: string
}

export interface RejectDirectiveCommand {
  type: 'reject_directive'
  directiveId: string
  processingNote: string
}

export interface CancelDirectiveCommand {
  type: 'cancel_directive'
  directiveId: string
  reason?: string
}

export interface ReleaseDirectiveClaimCommand {
  type: 'release_directive_claim'
  directiveId: string
  reason: string
}

export interface SubmitNewsCommand {
  type: 'submit_news'
  title: string
  content: string
  source: string
}

export interface ReviewNewsCommand {
  type: 'review_news'
  newsId: string
  decision: 'publish' | 'reject'
  note?: string
}

export interface WithdrawNewsCommand {
  type: 'withdraw_news'
  newsId: string
  reason: string
}

export interface PublishSituationCommand {
  type: 'publish_situation'
  title: string
  content: string
  timelineId: string
  relatedBattleId?: string
  relatedLocation?: { lat: number; lng: number; label?: string }
}

export interface WithdrawSituationCommand {
  type: 'withdraw_situation'
  situationId: string
  reason: string
}

export type HostCommand =
  | AuthenticateUserClientCommand
  | StartConferenceCommand
  | StopConferenceCommand
  | SubmitDirectiveCommand
  | ClaimDirectiveCommand
  | ApproveDirectiveCommand
  | RejectDirectiveCommand
  | CancelDirectiveCommand
  | ReleaseDirectiveClaimCommand
  | SubmitNewsCommand
  | ReviewNewsCommand
  | WithdrawNewsCommand
  | PublishSituationCommand
  | WithdrawSituationCommand

/** Commands accepted from a Seat-authenticated UserClient. */
export type UserClientCommand =
  | SubmitDirectiveCommand
  | ClaimDirectiveCommand
  | ApproveDirectiveCommand
  | RejectDirectiveCommand
  | CancelDirectiveCommand
  | SubmitNewsCommand
  | ReviewNewsCommand
  | WithdrawNewsCommand
  | PublishSituationCommand
  | WithdrawSituationCommand

/** The Host Console is deliberately limited to lifecycle and recovery commands. */
export type HostConsoleCommand =
  StartConferenceCommand | StopConferenceCommand | ReleaseDirectiveClaimCommand

export interface UserClientActor {
  kind: 'user_client'
  sessionId: string
  conferenceId: string
  seatId: string
  committeeId: string
  capabilities: Capability[]
}

export interface HostConsoleActor {
  kind: 'host_console'
}

/** Actor passed to the Host Runtime's single execute(actor, command) path. */
export type HostActor = UserClientActor | HostConsoleActor

export interface HostExecuteRequest<C extends HostCommand = HostCommand> extends RequestContext {
  command: C
}

export interface HostError {
  code:
    | 'unauthenticated'
    | 'forbidden'
    | 'not_found'
    | 'invalid_command'
    | 'conflict'
    | 'no_active_conference'
    | 'duplicate_request'
    | 'session_revoked'
  message: string
  field?: string
}

export type HostExecuteResult<T = unknown> =
  | { ok: true; requestId: string; value: T; replayed?: boolean }
  | { ok: false; requestId: string; error: HostError }

export type HostClientMessage =
  | {
      type: 'auth'
      requestId: string
      inviteCode: string
      password?: string
      clientKind?: 'user_client'
    }
  | {
      type: 'execute'
      requestId: string
      idempotencyKey?: string
      command: Exclude<HostCommand, AuthenticateUserClientCommand>
    }
  | { type: 'query'; requestId: string; query: HostQuery }

export type HostQuery =
  { type: 'session_projection' } | { type: 'workflow_queue' } | { type: 'chair_projection' }

export type HostServerMessage =
  | {
      type: 'auth_result'
      requestId: string
      success: boolean
      session?: AuthenticatedSeatSession
      error?: HostError
    }
  | {
      type: 'projection'
      requestId: string
      projection: UserClientSessionProjection
    }
  | {
      type: 'workflow_queue'
      requestId: string
      projection: WorkflowAudienceProjection
    }
  | {
      type: 'chair_projection'
      requestId: string
      projection: ChairCommitteeProjection
    }
  | {
      type: 'command_result'
      requestId: string
      result: HostExecuteResult
    }
  | {
      type: 'content_changed'
      conferenceId: string
      contentType: 'directive' | 'news' | 'situation'
      content: Directive | News | SituationUpdate
    }
  | {
      type: 'session_revoked'
      reason: 'replaced' | 'permissions_changed' | 'conference_switched' | 'host_shutdown'
    }
  | {
      type: 'error'
      requestId?: string
      error: HostError
    }

/** Narrow a decoded unknown value to a protocol message at runtime. */
export function isHostClientMessage(value: unknown): value is HostClientMessage {
  if (value == null || typeof value !== 'object') return false
  const type = (value as { type?: unknown }).type
  return type === 'auth' || type === 'execute' || type === 'query'
}

/** Narrow a decoded unknown value to a server message at runtime. */
export function isHostServerMessage(value: unknown): value is HostServerMessage {
  if (value == null || typeof value !== 'object') return false
  const type = (value as { type?: unknown }).type
  return (
    type === 'auth_result' ||
    type === 'projection' ||
    type === 'workflow_queue' ||
    type === 'chair_projection' ||
    type === 'command_result' ||
    type === 'content_changed' ||
    type === 'session_revoked' ||
    type === 'error'
  )
}

/** Capabilities required for ordinary content reads. */
export const VIEW_CAPABILITY_BY_CONTENT: Record<
  'directive' | 'news' | 'situation' | 'file',
  Capability
> = {
  directive: 'view_conference',
  news: 'view_news',
  situation: 'view_situation',
  file: 'view_files'
}
