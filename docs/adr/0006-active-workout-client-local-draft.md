# Active Workout progress is a client-local draft, not a server-side session

The core-UI-components handoff's Active Workout screen logs sets against a Workout in real time (per-set done toggles, a running "N / M sets logged" readout), and the Dashboard's "Continue" panel resumes it. The schema has no concept of an in-progress session — `loggedWorkouts.create` (see `packages/api/src/routers/logged-workouts.ts`) is atomic: it accepts a whole finished session's exercises/sets in one call, mirroring the domain model's Logged Workout (CONTEXT.md), which records only what was actually performed, not a partial/in-flight state.

We decided **not** to add a server-side "in-progress session" table. Instead, the in-progress state (`{ workoutId, exercises: [{ templateExerciseId, sets: [{ actualReps, actualLoad, done }] }], startedAt }`) lives entirely client-side — persisted to `localStorage` (web) / `AsyncStorage` (mobile), keyed per user — and is only written to the server once, atomically, via the existing `loggedWorkouts.create` when the session is finished. The Dashboard's "Continue" panel reflects this local draft directly; it never guesses "today's workout" from schedule data, because no scheduling concept exists in the domain model.

## Considered Options

**Server-persisted in-progress session** (a new `logged_workout_drafts` table, upserted per set) was rejected for this pass: it would require new schema/migrations and turns every set-toggle into a network write, for a benefit (cross-device resume, surviving a lost local storage) the handoff never asks for. The atomic `loggedWorkouts.create` already matches the domain model's stated invariant that a Logged Workout records only what was actually performed — an in-progress session is, by definition, not yet that.

**Client-local draft** (chosen) keeps every set-toggle instant and offline-safe, requires zero backend changes, and cleanly maps onto the existing atomic `create` mutation as the single commit point. Cost accepted: the draft doesn't survive a cleared browser/app storage, and doesn't sync across devices — acceptable since the handoff's Active Workout is single-session, single-device by design (nothing in the screens implies cross-device handoff).

## Consequences

- If cross-device resume or crash-safe server-side progress is ever needed, revisit this ADR — it is a real, deliberate scope cut, not an oversight.
- Starting a second workout while a draft is in progress confirms-and-replaces (a dialog warns the in-progress draft will be discarded) rather than blocking, since nothing has been submitted to the server yet and there's no server state to reconcile.
- The Plan Builder cart (`{ planId, workoutId | null, items }`) uses the same storage-backed draft pattern for the same reason — it must survive the Exercise Edit round-trip navigation, and reusing one mechanism beats introducing a second (e.g. an in-memory store) for a single round-trip.
