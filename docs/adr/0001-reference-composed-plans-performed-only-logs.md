# Reference-composed plans, performed-only logs

Plans compose Workouts, and Workouts reference Template Exercises (via Prescribed Exercises), **by reference** (many-to-many join tables), so a user authors a Workout or Template Exercise once and reuses it across Plans; edits propagate. Training history (a **Logged Workout** and its Logged Exercises / Logged Sets) is **performed-only**: it records what the user actually did — no prescription snapshot is frozen and there is no runtime link between a Logged Set and the Prescribed Set it may have come from. A Logged Exercise references its Template Exercise **live**; a Template Exercise with logged history is soft-deleted (**Archived**), never hard-deleted, so history stays resolvable and renames propagate.

## Considered Options

- **Copy-on-add** instead of reference: adding a Workout to a second Plan would clone it, isolating edits. Rejected — it defeats "author once, reuse" and fragments the Template Exercise identity that progress tracking depends on.
- **Adherence tracking** (snapshot the prescription onto each Logged Workout and diff performed-vs-planned): rejected deliberately. Motivation/adherence is treated as the user's concern, not the app's, and snapshotting is unrecoverable-to-remove once data exists. Performed-only keeps logging simple and the log queryable.

## Consequences

- Because edits to a shared Workout propagate, the *plan* side is always "current" — there is intentionally no historical view of "what this Workout used to prescribe."
- Adherence ("did I do what I planned?") is **not answerable** from the data. Adding it later requires introducing a snapshot at log time; it cannot be backfilled.
- Template Exercises are never physically deleted once used; queries over the library must filter Archived.
