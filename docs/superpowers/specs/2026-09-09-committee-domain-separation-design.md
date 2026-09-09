# Committee Domain Separation Design

## Goal

Align the frontend and Electron data flow with the CONTEXT model: `Conference` owns大会级共享资源, `Committee` owns Chair-local agenda and procedure state, and Host/LAN code never imports or exposes Committee procedure details.

## Confirmed domain rules

- `Conference` is the aggregate for conference-wide resources and owns a collection of `Committee` objects.
- `Committee` is a separate domain object for one local venue. Its phase, agenda, participants, speaker lists, motions, voting sessions, minutes, caucus state, and timer state belong to the Chair side.
- A Chair may receive a `ChairCommitteeProjection` and send a local projection to Display. Display communicates only with Chair.
- Host Service and Host Console may identify an active Conference and route authorized shared-content operations, but they do not read, persist, broadcast, or mutate Committee agenda state.
- LAN discovery returns connection identity and address only. It does not contain `phase`, present/voting counts, current speaker, minutes, motion state, timer state, or any other procedure field.

## Module layout

### Domain classes

- `apps/frontend/src/lib/classes/domain/conference.svelte.ts`
  - Remains the reactive `Conference` aggregate.
  - Stores `Committee` instances, not plain mutable DTOs.
  - Exposes copies of collections and controlled methods (`getCommittee`, `addCommittee`, `replaceCommittee`, etc.).
  - Serializes nested committees through `Committee.toJSON()`.

- `apps/frontend/src/lib/classes/domain/committee.svelte.ts`
  - Becomes the canonical reactive `Committee` class.
  - Absorbs the implementation currently in `services/engine/ConferenceEngine.svelte.ts` without the misleading `ConferenceEngine` name.
  - Exposes `constructor`, `static fromJSON`, `toJSON`, controlled seat/procedure mutations, and existing agenda operations.
  - Keeps Chair-only side effects behind the class seam: local minutes, Display projection, and local service events are generated from Committee operations.
  - Exposes read-only derived accessors such as `participantSeats`, `speakerList`, `currentSpeaker`, and majority thresholds.

### Committee types

- `apps/frontend/src/lib/classes/types/committee.ts`
  - Owns `ConferencePhase`, agenda, speaker-list, yield, point, motion, resolution, voting, caucus, minutes, `MajorityThresholds`, and `Committee` DTO types.
  - Owns labels that are semantically Committee-specific only when they are required by the local Chair UI; shared text labels used by multiple surfaces are exposed through a formatter module.

- `apps/frontend/src/lib/classes/types/committee-display.ts`
  - Owns `ConferenceDisplayData`, Display speaker/voting projections, motion/point drafts, timer status, and Chair-to-Display payload types.
  - Keeps Display payloads separate from persisted Committee DTOs.

- `apps/frontend/src/lib/classes/types/conference.ts`
  - Owns only the Conference aggregate DTO and大会级 resources (`User`, `SeatAccess`, `RoleTemplate`, `SeatGroup`, `News`, `SituationUpdate`, and related imports).
  - Re-exports Committee types only during the migration where existing imports would otherwise cause unnecessary churn; no Conference implementation imports Committee procedure helpers.

- `apps/frontend/src/lib/classes/types/timer.ts`
  - Owns generic `TimerTickData` shared by the reusable timer and Display bridge.

### Pure utilities

- `apps/frontend/src/lib/classes/utils/committee/phase.ts`
  - `VALID_TRANSITIONS`, `canTransition`, `transitionPhase`, `PHASE_LABELS`.

- `apps/frontend/src/lib/classes/utils/committee/voting.ts`
  - `calculateMajorityThresholds`, `determinePassFail`, `tallyVotes`.

- `apps/frontend/src/lib/classes/utils/committee/motions.ts`
  - `MotionResolution`, `resolveMotion`.

- `apps/frontend/src/lib/classes/utils/committee/caucus.ts`
  - `calcMaxSpeakers` and any other pure caucus calculations.

Every exported utility receives explicit inputs, returns values instead of mutating state, and has JSDoc describing invariants, edge cases, and return semantics.

### Reusable timer

- `apps/frontend/src/lib/classes/services/timer/timer.ts`
  - Owns the generic `Timer` implementation and its registry (`createTimer`, `getTimer`, `destroyTimer`, `destroyAllTimers`).
  - Has no import from Committee, Conference, Display, or stores.
  - The standalone timer store and Chair hooks depend on this module directly.

The old `services/engine/conference-engine.ts` file is removed after all consumers migrate. No compatibility façade remains; this prevents future Host code from discovering Committee APIs through a convenient but incorrect import.

## Dependency direction

```text
Conference domain
  -> Committee domain (nested aggregate member)

Committee domain
  -> committee types
  -> committee pure utilities
  -> generic Timer service
  -> Chair-to-Display bridge (only for local projection output)

Host/LAN data + preload
  -> Host conference identity DTOs
  -> no Committee types, phase labels, or procedure utilities

Display route
  -> committee-display types
  -> Chair-to-Display bridge
```

The Host-facing `ConferenceEntry`/`ConferenceSummary` data contract is reduced to shared conference identity and content metadata. Existing Host event names may remain for shared-data lifecycle compatibility, but procedure-specific fields and update patches are removed.

## Data integrity and migration

1. Move the existing `Committee` class implementation into `domain/committee.svelte.ts` with no behavioral changes.
2. Replace every `CommitteeDTO` boundary with `Committee` instances inside frontend stores; use `Committee.fromJSON()` when loading and `Committee.toJSON()` when persisting or sending a projection.
3. Keep collection getters copy-on-read. Mutations must go through domain methods so `Conference.replaceCommittee()` and store persistence remain the only aggregate synchronization path.
4. Update `conference-display-client.ts` to consume `committee-display` and utility modules directly; it may accept either a `Committee` instance or a Committee DTO at the projection seam.
5. Update Chair routes/components/hooks/stores to import from domain, `utils/committee/*`, or `services/timer/*`.
6. Update Host/LAN service, IPC, preload declarations, and join-page models to remove `phase` and any procedure-derived fields. The Host advertisement payload should be `{ conferenceId, name }` plus address metadata supplied by discovery.
7. Preserve persisted JSON field names for Committee data so existing local data remains readable. `fromJSON()` normalizes missing optional fields and clears expired runtime timer snapshots as the current class does.

## Error and compatibility policy

- Invalid phase transitions continue to return an `Error` from the pure phase utility; the Committee class remains responsible for deciding whether to apply the returned phase.
- Unknown or missing persisted Committee fields use the existing defaults. No Host-side fallback should invent a Committee phase.
- LAN clients display the discovered Conference name and address only. They must not cast or index a phase label map.
- Any legacy Host store record containing `phase`, `presentCount`, `votingCount`, or `currentSpeaker` is read permissively but these fields are ignored and never emitted by the new Host DTO.

## Verification

- `pnpm --filter @vetoexpress/frontend check` must pass with no imports from Host-facing files to `services/engine/conference-engine` or `domain/committee`.
- A repository search must show zero consumers of the removed `conference-engine.ts` path.
- Frontend tests cover Committee round-trip serialization, copy-on-read collections, phase transitions, majority thresholds, motion resolution, caucus speaker calculation, and Timer lifecycle.
- Electron tests cover LAN advertisement/query payloads without `phase` and reject procedure fields in Host update patches.
- A type-level/build check confirms Display still receives phase through Chair-owned `ConferenceDisplayData`, while Host/LAN types do not expose it.

## Non-goals

- Renaming persisted `Conference` JSON to a new aggregate name.
- Moving shared News, SituationUpdate, User, or SeatAccess workflows into Committee.
- Introducing remote Chair takeover or cross-device agenda synchronization.
- Changing existing Chair agenda behavior while moving it behind the correct domain seam.
