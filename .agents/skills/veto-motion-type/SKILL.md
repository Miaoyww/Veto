---
name: veto-motion-type
description: Add or change a Veto committee motion type end to end. Use for motion work that must cross the domain contract, proposal dialog, voting policy, execution, Chair UI, venue display projection, timer or phase state, and tests. Skip for copy-only edits or unrelated timers.
---

# Veto Motion Type

Extend a motion as one coherent vertical slice. A motion is complete only when every applicable layer below recognizes it and the observable Chair and venue flows work.

## Establish the behavior

Before editing, inspect the current repository and trace the closest existing motion with `rg`. Do not assume the paths or switches listed here are exhaustive; use them as starting points.

Classify the requested motion:

- payload fields and validation;
- phases in which it is offered;
- whether it needs no vote, simple majority, or two-thirds;
- the state transition after approval;
- whether it is a one-shot action, a total countdown, or a queued per-speaker flow;
- its Chair screen, venue screen, logs, pause/resume/end behavior, and return phase.

Confirm the exact user-facing name. Keep the internal identifier stable and use the label map wherever possible so a later wording correction is localized.

## Implement the vertical slice

1. **Domain contract** — update `apps/frontend/src/lib/classes/types/committee.ts`:
   - add the identifier to `MotionType`;
   - add a typed motion interface and include it in `Motion`;
   - add its `MOTION_LABELS` entry;
   - extend runtime state unions such as `CaucusType` only when the running state must distinguish the new motion.
   Re-export new public interfaces from `types/conference.ts` when that compatibility barrel exposes its peers.

2. **Proposal and voting policy** — update `components/conference/motion/motion-dialog.svelte` and `utils/committee/motions.ts`:
   - put the option in the correct phase-specific lists and icon map;
   - add form state, reset behavior, committed-value handling, payload construction, dirty checks, validation, and `motionDraft` projection for every new field;
   - assign the intended vote requirement and majority.
   Follow the existing shadcn-svelte composition and icon conventions.

3. **Execution** — trace `approveMotion` into `domain/committee.svelte.ts` and add the approved action to the relevant switch and transition helpers. Account for start, pause/resume, expiry or manual end, logs, and the phase reached afterward. Also inspect alternate or legacy vote-completion paths in the same aggregate; keep them behaviorally aligned if they remain reachable.

   Approval may already execute the motion. Ensure one approval causes exactly one start transition and one set of start logs; do not add a second starter merely because a nearby caller has one.

4. **Chair presentation** — update `utils/committee/chair-presentation.ts` and the component selected by `components/conference/chair/chair-phase-view.svelte`. For a countdown-only motion, reuse the existing countdown view and add a distinct mode only when its title, icon, log wording, or persisted identity must remain distinct.

5. **Venue projection and rendering** — inspect `clients/conference-display-client.ts`, `types/committee-display.ts`, and both venue routes:
   - project all motion fields needed while proposed, pending, resolved, and active;
   - render the proposal/result in `routes/display/[committee_id]/motion/index.svelte`;
   - render the active phase in the corresponding display route, such as `caucus/index.svelte` for total countdowns.
   Update the Chair motion-vote page so it shows the label, icon, and parameters used for the decision.

6. **Exhaustive audit** — search for the closest analogous motion identifier and inspect every switch, conditional, record, union, serialization boundary, phase router, and test it reaches. Then search for the new identifier and verify every occurrence has a purpose. Treat successful type checking as a backstop, not as proof that runtime routing is complete.

## Countdown-only motions

When the user says the flow is the same as free caucus and is essentially a timer:

- store a duration on the motion;
- map approval to an `activeCaucus`-style runtime record with its own discriminant when the displayed identity matters;
- reuse `use-caucus-countdown.svelte.ts` and `caucus-countdown-view.svelte` for ticking, persistence, pause/resume, expiry, and early termination;
- add the mode to Chair screen mapping, display projection, and venue rendering;
- keep the flow free of speaker queues and per-speaker allocation.

Reuse mechanics, not wording: titles, end labels, phase logs, and icons must describe the new motion rather than “自由磋商”.

## Verification

Add focused tests for:

- voting resolution;
- approval creating the intended runtime state and payload;
- Chair screen mapping for every new runtime discriminant;
- absence of speaker queues for countdown-only motions.

Run, from the repository root:

```powershell
pnpm --filter @vetoexpress/frontend check
pnpm test
pnpm build:frontend
git diff --check
```

Completion requires zero new type/check errors, passing tests, a successful frontend build, and a final diff limited to the motion slice. Report pre-existing warnings separately.
