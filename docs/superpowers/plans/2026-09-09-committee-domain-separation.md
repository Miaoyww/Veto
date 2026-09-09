# Committee Domain Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate Conference identity/content from Chair-owned Committee procedure state, make `Committee` a reactive domain aggregate, and ensure Host/LAN code never exposes Committee agenda fields.

**Architecture:** Move Committee DTOs and procedure helpers into committee-scoped modules, move the reusable timer into an independent timer service, and migrate the existing reactive implementation into `domain/committee.svelte.ts`. Keep `Conference` as the大会 aggregate containing `Committee` instances. Reduce Electron Host/LAN contracts to conference identity and shared content metadata; Display receives procedure state only through Chair-owned display projections.

**Tech Stack:** TypeScript 5.9, Svelte 5 runes, SvelteKit, Electron 43, Vitest 4, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-09-09-committee-domain-separation-design.md`

## Global Constraints

- `Conference` owns大会级资源 and a collection of `Committee` instances; `Committee` owns all Chair-local agenda/procedure state.
- Host Service, Host Console, LAN discovery, preload types, and Host-facing plugin APIs must not read, persist, broadcast, or mutate Committee procedure fields.
- LAN discovery advertises only conference identity/address metadata; it must not contain `phase`, attendance counts, current speaker, minutes, motion, voting, caucus, or timer state.
- Persisted Committee JSON field names remain readable; `Committee.fromJSON()` supplies defaults and does not restore expired runtime timer snapshots.
- Collection getters are copy-on-read and state changes go through domain methods.
- Every exported committee utility has explicit inputs/outputs and JSDoc covering invariants, edge cases, and return semantics.
- No consumer may import `apps/frontend/src/lib/classes/services/engine/conference-engine.ts` after migration; both legacy engine files are removed.

---

### Task 1: Split Committee and Timer Type Contracts

**Files:**
- Create: `apps/frontend/src/lib/classes/types/committee.ts`
- Create: `apps/frontend/src/lib/classes/types/committee-display.ts`
- Create: `apps/frontend/src/lib/classes/types/timer.ts`
- Modify: `apps/frontend/src/lib/classes/types/conference.ts`
- Test: `apps/frontend/src/lib/classes/types/committee.test.ts`

**Interfaces:**
- Produces `ConferencePhase`, all agenda/speaker/yield/point/motion/voting/caucus/minutes types, `MajorityThresholds`, and `Committee` DTO from `types/committee.ts`.
- Produces `ConferenceDisplayData`, `MotionDraft`, `PointDraft`, display speaker/voting/caucus projections, and Chair-to-Display payload types from `types/committee-display.ts`.
- Produces generic `TimerTickData` and timer status types from `types/timer.ts`.
- `types/conference.ts` retains `Conference` DTO and大会级 imports, with temporary type-only re-exports for existing callers.

- [x] **Step 1: Write the failing type-boundary test**

```ts
import type { Conference } from './conference'
import type { Committee, MajorityThresholds } from './committee'
import type { ConferenceDisplayData } from './committee-display'

const committee: Committee = {} as Committee
const thresholds: MajorityThresholds = { presentCount: 0, votingCount: 0, totalCount: 0, simpleMajorityThreshold: 1, twoThirdsThreshold: 0 }
const display: ConferenceDisplayData = {} as ConferenceDisplayData
const conference: Conference = { committees: [committee] } as Conference
void thresholds
void display
void conference
```

- [x] **Step 2: Run the focused type check to verify the new modules are absent**

Run: `pnpm --filter @vetoexpress/frontend exec svelte-check --tsconfig ./tsconfig.json`

Expected: FAIL because the committee and timer modules do not yet exist.

- [x] **Step 3: Move declarations without changing persisted field names**

Copy the existing Committee-related declarations from `types/conference.ts` into the three new modules. Keep `Conference` DTO in `types/conference.ts`; add type-only re-exports there while consumers are migrated. Put `MajorityThresholds` in `committee.ts`, not in `voting.ts`.

- [x] **Step 4: Run the focused type check**

Run: `pnpm --filter @vetoexpress/frontend check`

Expected: PASS for the type declarations, with only import-path migration errors remaining if any.

- [x] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/classes/types docs/superpowers/plans/2026-09-09-committee-domain-separation.md
git commit -m "refactor: split committee and display type contracts"
```

### Task 2: Extract Pure Committee Utilities

**Files:**
- Create: `apps/frontend/src/lib/classes/utils/committee/phase.ts`
- Create: `apps/frontend/src/lib/classes/utils/committee/voting.ts`
- Create: `apps/frontend/src/lib/classes/utils/committee/motions.ts`
- Create: `apps/frontend/src/lib/classes/utils/committee/caucus.ts`
- Create: `apps/frontend/src/lib/classes/utils/committee/*.test.ts`
- Modify: `apps/frontend/src/lib/classes/services/engine/conference-engine.ts`

**Interfaces:**
- `phase.ts`: `VALID_TRANSITIONS: Record<ConferencePhase, ConferencePhase[]>`, `canTransition(from, to): boolean`, `transitionPhase(from, to): ConferencePhase | Error`.
- `voting.ts`: `calculateMajorityThresholds(seats: ParticipantSeat[]): MajorityThresholds`, `determinePassFail(ballots: VoteBallot[], rule: MajorityRule, seats: ParticipantSeat[]): 'passed' | 'failed'`, `tallyVotes(ballots: VoteBallot[]): { yes: number; no: number; abstain: number }`.
- `motions.ts`: `MotionResolution` and `resolveMotion(motionType: MotionType): MotionResolution`.
- `caucus.ts`: `calcMaxSpeakers(totalTimeSec: number, speakingTimePerPersonSec: number): number`.

- [ ] **Step 1: Add behavior tests copied from current implementation**

```ts
it('returns an Error for invalid phase transitions', () => expect(transitionPhase('closed', 'voting')).toBeInstanceOf(Error))
it('calculates majority thresholds from present/voting seats', () => {
  expect(calculateMajorityThresholds(seats)).toMatchObject({ presentCount: 2, votingCount: 2, totalCount: 2, simpleMajorityThreshold: 2, twoThirdsThreshold: 2 })
})
it('does not count skipped ballots', () => expect(tallyVotes([{ seatId: 'a', vote: 'yes' }, { seatId: 'b', vote: 'skip' }])).toEqual({ yes: 1, no: 0, abstain: 0 }))
it('floors moderated caucus speaker capacity', () => expect(calcMaxSpeakers(121, 60)).toBe(2))
```

- [ ] **Step 2: Run the utility tests and verify failure**

Run: `pnpm --filter @vetoexpress/frontend exec vitest run src/lib/classes/utils/committee`

Expected: FAIL because the modules and functions are not defined.

- [ ] **Step 3: Implement pure utilities with JSDoc**

Move the exact algorithms from `services/engine/conference-engine.ts`; remove imports of Conference, Committee, stores, and timers. Preserve invalid-transition errors and zero/negative speaking-time behavior (`calcMaxSpeakers` returns `0` for non-positive per-person time).

- [ ] **Step 4: Run utility tests**

Run: `pnpm --filter @vetoexpress/frontend exec vitest run src/lib/classes/utils/committee`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/classes/utils/committee apps/frontend/src/lib/classes/services/engine/conference-engine.ts
git commit -m "refactor: extract committee procedure utilities"
```

### Task 3: Extract the Generic Timer Service

**Files:**
- Create: `apps/frontend/src/lib/classes/services/timer/timer.ts`
- Create: `apps/frontend/src/lib/classes/services/timer/timer.test.ts`
- Modify: `apps/frontend/src/lib/classes/services/engine/conference-engine.ts`

**Interfaces:**
- `Timer` preserves the existing constructor and methods: `new Timer(id, tickMs?)`, `start(totalSec, onTick, onExpire, initialElapsedSec?)`, `pause(): number`, `resume(onTick, onExpire): void`, `stop(): void`, and getters `isRunning`, `elapsedSec`, `remainingSec`.
- Registry functions: `createTimer(id, tickMs?): Timer`, `getTimer(id): Timer | undefined`, `destroyTimer(id): void`, `destroyAllTimers(): void`.
- Callbacks consume `TimerTickData` from `types/timer.ts`; this module imports no Committee, Conference, Display, or stores.

- [ ] **Step 1: Write timer lifecycle tests**

```ts
it('reuses a timer by id', () => expect(createTimer('x')).toBe(createTimer('x')))
it('pause returns elapsed time and destroy removes the timer', () => {
  const timer = createTimer('x', 10)
  timer.start(1, vi.fn(), vi.fn())
  expect(typeof timer.pause()).toBe('number')
  destroyTimer('x')
  expect(getTimer('x')).toBeUndefined()
})
```

- [ ] **Step 2: Run timer tests to verify failure**

Run: `pnpm --filter @vetoexpress/frontend exec vitest run src/lib/classes/services/timer/timer.test.ts`

Expected: FAIL because the timer service does not exist.

- [ ] **Step 3: Move Timer and registry implementation**

Move the implementation unchanged, replacing its local tick type with `TimerTickData`. Keep timer expiration and callback ordering identical.

- [ ] **Step 4: Run timer tests**

Run: `pnpm --filter @vetoexpress/frontend exec vitest run src/lib/classes/services/timer/timer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/classes/services/timer apps/frontend/src/lib/classes/services/engine/conference-engine.ts
git commit -m "refactor: move reusable timer out of conference engine"
```

### Task 4: Make `domain/committee.svelte.ts` the Canonical Reactive Aggregate

**Files:**
- Modify: `apps/frontend/src/lib/classes/domain/committee.svelte.ts`
- Create: `apps/frontend/src/lib/classes/domain/committee.test.ts`
- Modify: `apps/frontend/src/lib/classes/services/engine/ConferenceEngine.svelte.ts`

**Interfaces:**
- `Committee` keeps the existing public agenda operations (`setAttendance`, `completeRollCall`, speaker-list/yield/motion/point/caucus/voting methods, `setPhase`, `addSeat`, `updateSeat`, `getSeat`, `destroy`) and adds/retains `constructor(data?: Partial<CommitteeDTO>)`, `static fromJSON(json: CommitteeDTO): Committee`, and `toJSON(): CommitteeDTO`.
- Read-only derived accessors remain available: `currentSpeaker`, `nextSpeaker`, `readySpeaker`, `waitingSpeakers`, `speakerLists`, `participantSeats`, `getMajorityThresholds`, and seat-count helpers.
- `Conference` may store only `Committee` instances and serializes nested values via `Committee.toJSON()`.

- [ ] **Step 1: Write domain integrity tests**

```ts
it('round-trips a Committee through JSON', () => {
  const source = new Committee({ id: 'c1', name: 'GA', seats: [], agenda: [], motions: [], points: [], draftResolutions: [], documentNames: [], votingSessions: [], minutes: [], dismissedResolvedMotionIds: [], dismissedPointIds: [], defaultSpeakingTimeSec: 120, phase: 'preamble' })
  expect(Committee.fromJSON(source.toJSON()).toJSON()).toEqual(source.toJSON())
})
it('returns copy-on-read participant seats', () => {
  const committee = new Committee()
  const seats = committee.participantSeats
  const originalLength = seats.length
  seats.pop()
  expect(committee.participantSeats).toHaveLength(originalLength)
})
```

- [ ] **Step 2: Run domain tests to verify the current re-export fails the integrity contract**

Run: `pnpm --filter @vetoexpress/frontend exec vitest run src/lib/classes/domain/committee.test.ts`

Expected: FAIL or expose missing canonical-module behavior because `committee.svelte.ts` only re-exports the engine.

- [ ] **Step 3: Move the full implementation into `domain/committee.svelte.ts`**

Move `SpeakerList` and `Committee` from `ConferenceEngine.svelte.ts`; update imports to `types/committee`, committee utilities, generic timer, and the existing Chair-to-Display bridge. Preserve persisted fields, default normalization, local event emission, and projection behavior. Add JSDoc to public methods currently undocumented.

- [ ] **Step 4: Update `Conference` imports and validate aggregate nesting**

Keep `Conference` construction and `replaceCommittee` behavior unchanged except for importing Committee DTO types from `types/committee` and ensuring all collection getters remain copies.

- [ ] **Step 5: Run domain and frontend checks**

Run: `pnpm --filter @vetoexpress/frontend exec vitest run src/lib/classes/domain/committee.test.ts`

Expected: PASS.

Run: `pnpm --filter @vetoexpress/frontend check`

Expected: PASS after the implementation's internal imports are updated.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/lib/classes/domain apps/frontend/src/lib/classes/services/engine/ConferenceEngine.svelte.ts apps/frontend/src/lib/classes/types
git commit -m "refactor: promote committee to reactive domain aggregate"
```

### Task 5: Migrate Chair, Display, Store, and Hook Consumers

**Files:**
- Modify: `apps/frontend/src/lib/classes/clients/conference-display-client.ts`
- Modify: `apps/frontend/src/lib/classes/stores/conference/conference-store.ts`
- Modify: `apps/frontend/src/lib/classes/stores/conference/timer-store.ts`
- Modify: `apps/frontend/src/lib/classes/services/hooks/use-caucus-countdown.svelte.ts`
- Modify: `apps/frontend/src/lib/classes/services/hooks/use-speaker-timer.svelte.ts`
- Modify: all Chair routes/components currently importing `services/engine/conference-engine` (the `client/[conference_id]`, `conference/[conference_id]`, `conference/voting`, `conference/roll-call`, `conference/motion`, and `conference/speakers` paths)
- Modify: `apps/frontend/src/lib/components/conference-display/conference-header.svelte`
- Modify: `apps/frontend/src/lib/components/home/conference-card.svelte`
- Modify: `apps/frontend/src/routes/+page.svelte`
- Modify: `apps/frontend/src/routes/conference/+page.svelte`

**Interfaces:**
- Chair procedure consumers import `Committee`, `SpeakerList`, phase/voting/motion/caucus utilities, and Timer APIs from their canonical modules.
- `conference-display-client.ts` accepts Committee state or Committee DTO at the Chair projection boundary and returns `ConferenceDisplayData` from `types/committee-display.ts`.
- Host/conference overview components render only Conference identity/content; they do not import `PHASE_LABELS` and do not display phase/count/current-speaker badges.

- [ ] **Step 1: Migrate imports and Host-facing UI data**

Replace every old engine import with the utility/timer/domain path matching the symbol. Remove `PHASE_LABELS` from `conference-card.svelte`, root `+page.svelte`, and `routes/conference/+page.svelte`; remove LAN `meeting.phase` indexing and badges. Keep phase labels only in Chair and Display surfaces via `utils/committee/phase.ts`.

- [ ] **Step 2: Update store boundaries to hydrate domain objects**

When loading persisted conferences, call `Committee.fromJSON()`; when saving, call `Committee.toJSON()`. Do not expose mutable Committee DTO arrays from stores.

- [ ] **Step 3: Run frontend checks and boundary search**

Run: `pnpm --filter @vetoexpress/frontend check`

Expected: PASS.

Run: `rg -n "services/engine/conference-engine|ConferenceEngine.svelte" apps/frontend/src`

Expected: only the legacy files themselves remain until Task 7; no consumer imports.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src
git commit -m "refactor: migrate frontend consumers to committee modules"
```

### Task 6: Remove Procedure Fields from Electron Host and LAN Contracts

**Files:**
- Modify: `apps/electron/src/main/data/conferences.ts`
- Modify: `apps/electron/src/main/lan-service.ts`
- Modify: `apps/electron/src/main/ipc/lan.ts`
- Modify: `apps/electron/src/main/index.ts`
- Modify: `apps/electron/src/preload/index.ts`
- Modify: `apps/electron/src/preload/index.d.ts`
- Modify: `packages/types/index.d.ts`
- Modify: Host join/overview models under `apps/frontend/src/routes` and `apps/frontend/src/lib/components/home`

**Interfaces:**
- `LanConferenceInfo` is `{ conferenceId: string; name: string }`.
- `DiscoveredLanConference` adds only `host`, `port`, `url`, `wsUrl`, and `appVersion` to that identity.
- `ConferenceEntry`/`ConferenceSummary` contain identity, venue/content metadata, timeline, and shared resources; no `phase`, `presentCount`, `votingCount`, or `currentSpeaker`.
- `updateConference(id, patch)` accepts only shared Host fields and emits only shared-data lifecycle events; legacy procedure fields are ignored on read and never emitted.
- Preload and package plugin types mirror the reduced contract; no `phase` appears in LAN scan/query or Host conference summaries.

- [ ] **Step 1: Rewrite Electron tests for the reduced contract**

```ts
it('lists conference identity without procedure fields', () => {
  const result = listConferences()[0]
  expect(result).toMatchObject({ id: 'conf-1', name: 'Test Conference' })
  expect(result).not.toHaveProperty('phase')
  expect(result).not.toHaveProperty('currentSpeaker')
})
it('does not persist or emit procedure patches', () => {
  const updated = updateConference('conf-1', { timelineId: 'timeline-2' })
  expect(updated).toMatchObject({ id: 'conf-1', timelineId: 'timeline-2' })
  expect(updated).not.toHaveProperty('phase')
  expect(updated).not.toHaveProperty('currentSpeaker')
})
```

- [ ] **Step 2: Run Electron data tests to verify failure**

Run: `pnpm --filter @vetoexpress/electron exec vitest run src/main/__tests__/data.test.ts`

Expected: FAIL while the old fields and events remain.

- [ ] **Step 3: Reduce data and LAN implementations**

Remove phase/count/speaker fields from interfaces, list/query mappings, Bonjour TXT, health responses, IPC publish payloads, and active-conference broadcast. Read legacy stored records permissively by using structural input types, but construct and return only the reduced DTO.

- [ ] **Step 4: Update preload and plugin declarations**

Remove the same fields from `VetoAPI.lan`, Host conference types, `ConferencePatch`, and examples/comments in `packages/types/index.d.ts`. Preserve shared conference lifecycle APIs and event names where they describe shared data.

- [ ] **Step 5: Run Electron tests and typecheck**

Run: `pnpm --filter @vetoexpress/electron exec vitest run src/main/__tests__/data.test.ts src/main/__tests__/event-bus.test.ts src/main/__tests__/host-runtime.test.ts`

Expected: PASS.

Run: `pnpm --filter @vetoexpress/electron typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/electron/src packages/types/index.d.ts apps/frontend/src/routes apps/frontend/src/lib/components/home
git commit -m "refactor: remove committee procedure state from host contracts"
```

### Task 7: Delete Legacy Engine Entrypoints and Complete Documentation

**Files:**
- Delete: `apps/frontend/src/lib/classes/services/engine/conference-engine.ts`
- Delete: `apps/frontend/src/lib/classes/services/engine/ConferenceEngine.svelte.ts`
- Modify: `CONTEXT.md`
- Modify: relevant ADRs and module comments that still call Committee an engine or Conference procedure state

**Interfaces:**
- No compatibility facade remains. Canonical imports are `domain/committee`, `types/committee`, `types/committee-display`, `utils/committee/*`, and `services/timer/timer`.

- [ ] **Step 1: Run repository searches before deletion**

Run: `rg -n "services/engine/conference-engine|services/engine/ConferenceEngine.svelte|ConferenceEngine" apps/frontend apps/electron packages`

Expected: no consumer references; only files targeted for deletion and historical documentation may match.

- [ ] **Step 2: Delete the two legacy files and update terminology**

Remove the files after the search is clean. Update comments and CONTEXT/ADR text so Committee is consistently described as a domain aggregate and Timer as a generic service.

- [ ] **Step 3: Run full verification**

Run: `pnpm --filter @vetoexpress/frontend check`

Expected: PASS.

Run: `pnpm --filter @vetoexpress/electron typecheck`

Expected: PASS.

Run: `pnpm --filter @vetoexpress/electron exec vitest run`

Expected: PASS.

Run: `rg -n "services/engine/conference-engine|ConferenceEngine.svelte" apps/frontend/src apps/electron/src packages`

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: complete conference committee domain separation"
```

### Task 8: Final Review Against CONTEXT Protocol

**Files:**
- Test: `apps/frontend/src/lib/classes/domain/committee.test.ts`
- Test: `apps/frontend/src/lib/classes/utils/committee/*.test.ts`
- Test: `apps/frontend/src/lib/classes/services/timer/timer.test.ts`
- Test: `apps/electron/src/main/__tests__/data.test.ts`
- Test: `apps/electron/src/main/__tests__/host-runtime.test.ts`

**Interfaces:**
- Verification proves Committee serialization, copy-on-read collections, phase transitions, majority thresholds, motion resolution, caucus capacity, timer lifecycle, LAN payload exclusion, and Host patch rejection.

- [ ] **Step 1: Run the complete test matrix**

Run: `pnpm test`

Expected: PASS.

- [ ] **Step 2: Run the final dependency-direction checks**

Run: `rg -n "phase|presentCount|votingCount|currentSpeaker" apps/electron/src/main/lan-service.ts apps/electron/src/preload packages/types/index.d.ts`

Expected: no procedure-field matches in LAN/preload/Host type declarations; matches in unrelated event documentation must be removed or explicitly scoped to Chair/Display.

- [ ] **Step 3: Inspect the final diff and confirm no unrelated changes**

Run: `git diff --check; git status --short`

Expected: no whitespace errors and only files listed in this plan are changed.

- [ ] **Step 4: Commit verification notes**

```bash
git add docs/superpowers/plans/2026-09-09-committee-domain-separation.md
git commit -m "docs: finalize committee separation implementation plan"
```
