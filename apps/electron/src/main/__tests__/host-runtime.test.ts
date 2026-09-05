import { beforeEach, describe, expect, it } from 'vitest'
import type { Capability } from '../../../../shared/content-types'
import type { HostCommand, HostExecuteRequest } from '../../../../shared/host-protocol'
import {
  HostRuntime,
  type HostActor,
  type HostRuntimeRepository,
  type HostRuntimeState
} from '../host-runtime'

class MemoryRepository implements HostRuntimeRepository {
  state: HostRuntimeState | null
  saves = 0

  constructor(state: HostRuntimeState) {
    this.state = structuredClone(state)
  }

  load(): HostRuntimeState | null {
    return this.state == null ? null : structuredClone(this.state)
  }

  save(state: HostRuntimeState): void {
    this.saves += 1
    this.state = structuredClone(state)
  }
}

function state(): HostRuntimeState {
  const committee = (id: string, name: string, capabilities: Capability[], seatIds: string[]) => ({
    id,
    conferenceId: 'conference-1',
    name,
    type: id === 'ipc' ? ('ipc' as const) : ('cabinet' as const),
    defaultCapabilities: capabilities,
    seats: seatIds.map((seatId) => ({
      id: seatId,
      committeeId: id,
      name: `${seatId} seat`,
      role: `${seatId} role`,
      capabilityOverrides: {}
    }))
  })
  const access = [
    'source',
    'processor-1',
    'processor-2',
    'reviewer-1',
    'reviewer-2',
    'ipc',
    'observer'
  ]
  return {
    version: 1,
    conferences: [
      {
        id: 'conference-1',
        name: 'Conference One',
        committees: [
          committee(
            'source',
            'MPC',
            ['view_conference', 'view_news', 'submit_directive', 'draft_news'],
            ['source']
          ),
          committee(
            'target',
            'Cabinet',
            ['view_conference', 'process_directive'],
            ['processor-1', 'processor-2']
          ),
          committee('review', 'Review', ['review_news'], ['reviewer-1', 'reviewer-2']),
          committee(
            'ipc',
            'IPC',
            ['view_situation', 'publish_situation', 'withdraw_situation'],
            ['ipc']
          ),
          committee('observer', 'Observer', [], ['observer'])
        ],
        users: [],
        seatAccesses: access.map((seatId) => ({ seatId, inviteCode: `code-${seatId}` })),
        chairAssignments: [],
        timelines: [{ id: 'timeline-1', name: 'Timeline', simulationTime: 123, status: 'running' }],
        directives: [],
        news: [],
        situations: []
      }
    ],
    auditLog: [],
    idempotency: []
  }
}

let sequence = 0
let repository: MemoryRepository
let runtime: HostRuntime

beforeEach(() => {
  sequence = 0
  repository = new MemoryRepository(state())
  runtime = new HostRuntime(repository, {
    now: () => 1000 + sequence,
    id: () => `id-${++sequence}`
  })
  expect(runtime.startConference('conference-1').ok).toBe(true)
})

function authenticate(seatId: string): HostActor {
  const result = runtime.authenticate({ inviteCode: `code-${seatId}` })
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error.message)
  return result.actor
}

function execute(
  actor: HostActor,
  command: HostCommand,
  key: string
): ReturnType<HostRuntime['execute']> {
  const request: HostExecuteRequest = {
    requestId: `request-${key}`,
    idempotencyKey: key,
    command
  }
  return runtime.execute(actor, request)
}

function value<T>(result: ReturnType<HostRuntime['execute']>): T {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error.message)
  return result.value as T
}

describe('HostRuntime', () => {
  it('starts with no active conference after construction', () => {
    const fresh = new HostRuntime(new MemoryRepository(state()))
    expect(fresh.activeConference).toBeNull()
    expect(fresh.authenticate({ inviteCode: 'code-source' })).toMatchObject({
      ok: false,
      error: { code: 'no_active_conference' }
    })
  })

  it('does not let Host Console create business content', () => {
    const result = execute(
      { kind: 'host_console' },
      { type: 'submit_news', title: 'Headline', content: 'Text', source: 'MPC' },
      'console-content'
    )
    expect(result).toMatchObject({ ok: false, error: { code: 'forbidden' } })
  })

  it('requires a news review, a rejection reason, and accepts only the first decision', () => {
    const source = authenticate('source')
    const firstReviewer = authenticate('reviewer-1')
    const secondReviewer = authenticate('reviewer-2')
    const submitted = value<{ id: string }>(
      execute(
        source,
        { type: 'submit_news', title: 'Headline', content: 'Text', source: 'MPC Wire' },
        'news-1'
      )
    )

    const missingReason = execute(
      firstReviewer,
      { type: 'review_news', newsId: submitted.id, decision: 'reject' },
      'review-missing-reason'
    )
    expect(missingReason).toMatchObject({ ok: false, error: { field: 'note' } })

    const published = execute(
      firstReviewer,
      { type: 'review_news', newsId: submitted.id, decision: 'publish', note: 'verified' },
      'review-publish'
    )
    expect(published).toMatchObject({ ok: true, value: { status: 'published' } })
    const losingReview = execute(
      secondReviewer,
      { type: 'review_news', newsId: submitted.id, decision: 'reject', note: 'late' },
      'review-late'
    )
    expect(losingReview).toMatchObject({ ok: false, error: { code: 'conflict' } })

    const observer = authenticate('observer')
    const projection = runtime.query(observer, { type: 'session_projection' })
    expect(projection).toMatchObject({ news: [] })
    expect(JSON.stringify(projection)).not.toContain('inviteCode')
    expect(JSON.stringify(projection)).not.toContain('users')
  })

  it('atomically claims directives and only lets the claimant decide them', () => {
    const source = authenticate('source')
    const one = authenticate('processor-1')
    const two = authenticate('processor-2')
    const directive = value<{ id: string }>(
      execute(
        source,
        {
          type: 'submit_directive',
          title: 'Move unit',
          content: 'North',
          targetCommitteeId: 'target'
        },
        'directive-1'
      )
    )

    expect(
      execute(one, { type: 'claim_directive', directiveId: directive.id }, 'claim-one')
    ).toMatchObject({
      ok: true,
      value: { status: 'processing', claimedBySeatId: 'processor-1' }
    })
    expect(
      execute(two, { type: 'claim_directive', directiveId: directive.id }, 'claim-two')
    ).toMatchObject({
      ok: false,
      error: { code: 'conflict' }
    })
    expect(
      execute(
        one,
        { type: 'approve_directive', directiveId: directive.id, processingNote: '' },
        'approve-empty'
      )
    ).toMatchObject({ ok: false, error: { field: 'processingNote' } })
    expect(
      execute(
        one,
        { type: 'approve_directive', directiveId: directive.id, processingNote: 'Executed' },
        'approve'
      )
    ).toMatchObject({ ok: true, value: { status: 'approved', processingNote: 'Executed' } })
    expect(
      execute(source, { type: 'cancel_directive', directiveId: directive.id }, 'cancel-ended')
    ).toMatchObject({
      ok: false,
      error: { code: 'conflict' }
    })
  })

  it('allows the sender to cancel an unclaimed directive and records durable idempotency', () => {
    const source = authenticate('source')
    const request: HostExecuteRequest = {
      requestId: 'submit-request',
      idempotencyKey: 'same-key',
      command: {
        type: 'submit_directive',
        title: 'Cancel me',
        content: 'Soon',
        targetCommitteeId: 'target'
      }
    }
    const first = runtime.execute(source, request)
    const second = runtime.execute(source, { ...request, requestId: 'retry-request' })
    expect(first).toMatchObject({ ok: true })
    expect(second).toMatchObject({ ok: true, replayed: true })
    expect(repository.state?.conferences[0].directives).toHaveLength(1)

    const directive = value<{ id: string }>(first)
    expect(
      execute(
        source,
        { type: 'cancel_directive', directiveId: directive.id, reason: 'superseded' },
        'cancel-unclaimed'
      )
    ).toMatchObject({ ok: true, value: { status: 'cancelled' } })
    expect(repository.state?.auditLog.some((entry) => entry.action === 'directive_cancelled')).toBe(
      true
    )
  })

  it('lets only Host Console release a stuck directive claim and audits the recovery', () => {
    const source = authenticate('source')
    const processor = authenticate('processor-1')
    const directive = value<{ id: string }>(
      execute(
        source,
        {
          type: 'submit_directive',
          title: 'Recover',
          content: 'Stuck',
          targetCommitteeId: 'target'
        },
        'recovery-directive'
      )
    )
    expect(
      execute(processor, { type: 'claim_directive', directiveId: directive.id }, 'recovery-claim')
    ).toMatchObject({ ok: true })

    const release = runtime.execute(
      { kind: 'host_console' },
      {
        requestId: 'release-request',
        command: {
          type: 'release_directive_claim',
          directiveId: directive.id,
          reason: 'Processor disconnected'
        }
      }
    )
    expect(release).toMatchObject({ ok: true, value: { status: 'submitted' } })
    expect(repository.state?.auditLog).toContainEqual(
      expect.objectContaining({
        action: 'directive_claim_released',
        reason: 'Processor disconnected'
      })
    )
  })

  it('broadcasts situations only to viewers and requires an auditable withdrawal', () => {
    const ipc = authenticate('ipc')
    const situation = value<{ id: string }>(
      execute(
        ipc,
        {
          type: 'publish_situation',
          title: 'Update',
          content: 'State changed',
          timelineId: 'timeline-1'
        },
        'situation-1'
      )
    )
    expect(runtime.query(ipc, { type: 'session_projection' })).toMatchObject({
      situations: [{ id: situation.id, status: 'published', timeline: { simulationTime: 123 } }]
    })
    expect(
      execute(
        ipc,
        { type: 'withdraw_situation', situationId: situation.id, reason: '' },
        'withdraw-empty'
      )
    ).toMatchObject({ ok: false, error: { field: 'reason' } })
    expect(
      execute(
        ipc,
        { type: 'withdraw_situation', situationId: situation.id, reason: 'Incorrect feed' },
        'withdraw'
      )
    ).toMatchObject({ ok: true, value: { status: 'retracted' } })
    expect(runtime.query(ipc, { type: 'session_projection' })).toMatchObject({ situations: [] })
    expect(repository.state?.auditLog.some((entry) => entry.action === 'situation_withdrawn')).toBe(
      true
    )
  })

  it('replaces the previous session for a seat and rejects its later command', () => {
    const events: string[] = []
    runtime.subscribe((event) =>
      events.push(event.type === 'session_revoked' ? event.reason : event.type)
    )
    const oldActor = authenticate('source')
    const newActor = authenticate('source')
    expect(events).toContain('replaced')
    expect(
      execute(
        oldActor,
        { type: 'submit_news', title: 'Old', content: 'No', source: 'MPC' },
        'old-session'
      )
    ).toMatchObject({ ok: false, error: { code: 'session_revoked' } })
    expect(newActor).not.toEqual(oldActor)
  })
})
