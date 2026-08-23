# Fitnest

The domain language for Fitnest — a fitness app where users build training plans out of reusable workouts and exercises, and log the training they actually do.

## Language

Two sides mirror each other: **planning** (the prescription — what you intend to do) and **performance** (what you actually did). They are recorded independently; a Logged Workout does not retain the prescription it came from (see Logged Workout).

### Identity

**User**:
The owner of everything. Every Plan, Workout, Template Exercise and Logged Workout belongs to exactly one User, and nothing is shared across Users ([ADR 0002](docs/adr/0002-per-user-ownership-no-cross-user-sharing.md)). The term names **two halves that are deliberately separate**: an *account* at Clerk (email, password, session — Clerk is the identity provider) and a *`users` row* in Postgres (the ownership anchor every other table points at). They are joined by **`clerkUserId`**, and only that column knows about Clerk; the rest of the domain refers to the local row's id. A User's local row is created the first time they make an authenticated request, not when they register — see Provisioning. See [ADR 0009](docs/adr/0009-clerk-identity-jit-provisioning.md).
_Avoid_: Account, member, athlete; treating the Clerk id as the User's identity in domain code.

**Provisioning**:
Creating a User's local row and its starting data, on their first authenticated request after registering ("just-in-time"). Distinct from **registration**, which happens entirely at Clerk. Provisioning is idempotent — concurrent first requests resolve to one row — and it is the only moment Seeding happens for a real User.
_Avoid_: Signup (that's Clerk's half), onboarding (a UI flow, not this).

**Seeding**:
Giving a newly provisioned User their starting **Template Exercise library** — a copy of the classic exercises, with muscle tags and backup links. That is *all* a real User is seeded with. The demo Plan ("PPL 6-Week Hypertrophy") and its back-dated Logged Workouts are **dev fixtures**, given only to the seeded dev user by the `db:seed` script; fabricating them for a real User would report set volume for training they never did.
_Avoid_: Calling the dev fixture "the seed data" without qualification — say *the exercise library* or *the demo plan*.

### Planning (the prescription — what you intend to do)

**Plan**:
A whole training program owned by a User, e.g. "PPL 6-Week Hypertrophy". Has a duration and is composed of Workouts.
_Avoid_: Program, routine (routine means the middle grouping — see Workout).

**Workout**:
A named, reusable grouping of exercises intended to be done in one sitting, e.g. "Push Day A", owned by a single User. A Plan is composed of Workouts.
_Avoid_: Day, session (a Logged Workout is a performed instance — see below), routine.

**Template Exercise**:
A movement definition, e.g. "Bench Press", owned by a single User and reusable across that user's Workouts. Each user has their own library; there is no single canonical Template Exercise shared across users. New users are seeded with a copy of the classic exercises (see Seeding). A Template Exercise with logged history is never hard-deleted — it is **Archived** (hidden from pickers, still resolvable by past Logged Workouts). A rename propagates to all history, since it is the same movement.
_Avoid_: Exercise (ambiguous — say Template / Prescribed / Logged Exercise), movement; "global/shared catalog" (the library is per-user, not shared across users).

**Variant** _(Template Exercise)_:
A Template Exercise created by **cloning** another (its **source**), e.g. "Dumbbell Bench Press" cloned from "Barbell Bench Press". Cloning pre-fills the new Template from the source — movement pattern, target muscles, equipment, attachment, and a value-copy of the source's Backup Exercises — but **not** the source's Note, and the name must be changed. The variant is a fully independent Template; the only thing retained is **`variantOf`**, a nullable, immutable pointer to the **immediate** source (a lineage breadcrumb). `variantOf` carries **no behavior** — no shared history, no cascade; archiving the source never touches its variants. Null for Templates authored from scratch. See [ADR 0004](docs/adr/0004-exercise-variants-detached-clone-with-breadcrumb.md).
_Avoid_: Fork, derivative; "parent/child" (implies a cascade that does not exist).

**Prescribed Exercise**:
One line inside a Workout: a specific Template Exercise placed at an order position, carrying its prescription (its Prescribed Sets). The same Template Exercise can appear as a Prescribed Exercise in many Workouts. The planned counterpart to a Logged Exercise.
_Avoid_: Exercise entry, slot, item, workout-exercise.

**Prescribed Set**:
One target line within a Prescribed Exercise — target reps, load, and/or RPE for a single set. A Prescribed Exercise owns an ordered list of them; "3×8" is three Prescribed Sets. The intended (planned) counterpart to a Logged Set.
_Avoid_: Target set, planned set.

### Performance (what you actually did)

**Logged Workout**:
A performed instance of training on a date, owned by a User. May optionally originate from a Workout (used only to pre-populate the logging screen), but records only what was actually performed and does **not** retain the originating prescription. A freestyle Logged Workout has no originating Workout. The performed counterpart to a Workout.
_Avoid_: Session, workout (that's the plan-side template), log, entry.

**Logged Exercise**:
One Template Exercise performed within a Logged Workout, at an order position, owning its ordered Logged Sets. The performed counterpart to a Prescribed Exercise.
_Avoid_: Session-exercise, log entry.

**Logged Set**:
What actually happened for one set within a Logged Exercise — actual reps and actual load. The performed counterpart to a Prescribed Set, but stored independently: there is no runtime link between a Logged Set and any Prescribed Set, and a Logged Workout does not retain its originating prescription (no adherence tracking).
_Avoid_: Actual set, result set.

### Exercise attributes

Descriptive fields on the exercise tables. Each attribute names the table that **owns** it; because Prescribed/Logged Exercises reference the Template Exercise live, an attribute owned by the Template is read through that reference and is never copied down (a lower table only carries it when the fact can genuinely diverge there — see ADR 0001).

**Movement Pattern** _(Template Exercise)_:
The single primary pattern a movement trains, from a closed set: `push · pull · squat · hinge · lunge · carry · core`. Intrinsic to the movement; used for programming balance (e.g. push/pull volume). Not a per-slot or per-session value.
_Avoid_: Category, type; multiple patterns per exercise.

**Target Muscle** _(Template Exercise)_:
A muscle group a movement trains, tagged **primary** or **secondary**. Each Template Exercise has ≥1 primary and any number of optional secondary muscles. Drawn from a global, system-owned muscle-**group** vocabulary (`chest · back · quads · hamstrings · glutes · delts · biceps · triceps · calves · core · forearms · traps`) — universal anatomy, so a shared enum here does not violate the per-user rule (see [ADR 0002](docs/adr/0002-per-user-ownership-no-cross-user-sharing.md)).
_Avoid_: Muscle (say muscle *group*); individual/anatomical muscle names.

**Equipment** _(Template Exercise)_:
The single primary implement a movement uses, from a global, system-owned enum (`barbell · dumbbell · cable · machine · bodyweight · kettlebell · band …`). Intrinsic — a different implement is a different Template Exercise ("Barbell Bench Press" ≠ "Dumbbell Bench Press") — so it never diverges when prescribed or logged; its purpose is filtering. Optional.
_Avoid_: Gear, apparatus.

**Attachment** _(Template Exercise)_:
An optional modifier on the implement (mostly cable/machine): rope, wide bar, V-handle, ankle strap. Held on the Template only for now; per-session divergence (planned vs actual attachment) is deliberately **not** tracked — additive later via nullable overrides on Prescribed/Logged if ever wanted.
_Avoid_: Handle, grip.

**Note** _(Template · Prescribed · Logged Exercise)_:
Optional free-text that lives **independently at all three exercise levels**, because the fact differs per level and they co-exist rather than override: a Template note is a movement cue ("elbows tucked"), a Prescribed note is slot/programming intent ("superset with flyes, last set to failure"), a Logged note is a session observation ("felt easy, +2.5kg next time"). Unstructured and not filtered on. No set-level notes (a Logged Set carries no note).
_Avoid_: Comment, description; set-level notes.

**Backup Exercise** _(Template Exercise)_:
An optional, ordered, **directional** self-reference from one Template Exercise to other Template Exercises in the same user's library — the substitutes to reach for when the movement can't be done (equipment taken, tweak). A plan-time contingency only: it is read live wherever the movement is prescribed and is **never** on a Logged Exercise (if you do the substitute, the Logged Exercise just references the Template you actually performed). Archived Templates drop out of the picker. Slot-specific (Prescribed-level) backups are deferred/additive. A variant copies its source's backups by value at clone time (see Variant). **Future room:** users will eventually group backups into named **backup collections** per Template Exercise; the flat model stays additive-compatible (a `backup_collection` table + a nullable `collectionId` on the link, null = ungrouped) and must not be foreclosed.
_Avoid_: Alternative, substitute (use consistently as "backup"); reverse/symmetric links.
