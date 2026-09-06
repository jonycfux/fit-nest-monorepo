# Execution Attributes are intrinsic enum columns; the name is user-owned and only *suggested* from them

A Template Exercise gains five nullable, system-owned enum columns describing **how the movement is executed** — `gripWidth`, `gripOrientation`, `bodyPosition`, `laterality`, `rangeOfMotion` — collectively **Execution Attributes**. They are intrinsic to the movement in exactly the sense `equipment` already is (a different execution is a different Template Exercise), they are read by **only two** things — the Exercise Library's filters and a clone-time name suggestion — and they never copy down to Prescribed or Logged Exercises. The `name` column remains a plain user-owned string and the sole source of truth for display; attributes only *propose* a name when you clone.

This replaces the two `TODO` comments at the top of `packages/api/src/db/schema.ts`.

## Why they are not called "variant parameters"

The TODO called them variant parameters, which collides with **Variant** as [ADR 0004](0004-exercise-variants-detached-clone-with-breadcrumb.md) defines it: a Template created by cloning another, carrying a `variantOf` breadcrumb. Execution Attributes have nothing to do with that lineage. The seeded `"Seated Calf Raise"` has `variantOf = null` — nobody cloned it, it was authored that way — and is unmistakably *seated*. Under the old name a reader would reasonably assume the columns apply only where `variantOf IS NOT NULL`, or that they describe the *delta* between a variant and its source. Both readings are wrong and both produce wrong queries. They are attributes of the movement, so they sit in CONTEXT.md's Exercise attributes section next to Movement Pattern, Target Muscle, Equipment and Attachment.

## Scope decisions

**Tempo is excluded**, despite being on the TODO's list. It is the same species as `targetReps` / `targetLoad` / `targetRpe` on `prescribed_sets` — something you prescribe for a set, not something that defines a movement. It also fails both jobs these columns exist to do: its value space is unbounded (`3-1-1`, `4-0-2`, `2-0-X`) so it cannot populate a filter, and it yields no name fragment — nobody says "3-1-1 Bench Press". If tempo is ever wanted it is a nullable column on `prescribed_sets`.

**Grip is two axes, not one.** Width (`close · shoulder · wide`) and orientation (`pronated · supinated · neutral · mixed`) are orthogonal — a close-grip *supinated* pulldown is a real movement — and a single enum could only represent it by enumerating the cross-product. Two columns also give the filter UI two clean dropdowns instead of one list mixing unlike values. This sharpens a boundary CONTEXT.md had only warned about vaguely: **Attachment** is the implement between your hands and the load (rope, V-handle, wide bar); **grip** is where your hands go. A lat pulldown can have a wide bar taken at a narrow grip.

**Progress grouping and prescription-time precision are both out of scope.** Rolling progress up across grips would require knowing which Templates are the same base movement — that is the exercise-family behavior ADR 0004 deliberately deferred, and nothing here resurrects it. Letting a Workout say "Bench Press @ close grip" without minting a new Template would contradict [ADR 0003](0003-exercise-attributes-live-at-their-owning-level.md); these columns stay Template-owned and are read live through the reference, like every other intrinsic attribute.

## Advisory naming, not generative naming

The second TODO ("handle name change (aliasing) conditions based on variant parameters") is ambiguous between two mechanisms, and we chose the weaker one deliberately.

**Chosen — advisory:** `name` is stored text, always. A pure `suggestName(sourceName, sourceAttrs, cloneAttrs)` runs *only* in the clone flow and pre-fills an editable field. Nothing recomputes afterwards, so name and attributes may drift — which is correct, because the name is what the human chose to call the movement.

**Rejected — generative** (store a base name, render `base + fragments`): it cannot be reconciled with the existing library or the existing rules. Decomposing the 156 seeded names collides immediately — `"Seated Calf Raise"` and `"Standing Calf Raise"` both reduce to base `"Calf Raise"`, so uniqueness and search would have to operate on the computed string anyway. Worse, *rename stops existing as an operation*: editing `bodyPosition` would retroactively change how every past Logged Workout displays that movement, contradicting CONTEXT.md's "a rename propagates to all history, since it is the same movement", which assumes a rename is a deliberate act on a name.

**Rejected — advisory now, generative later** (store a nullable `baseName` breadcrumb): ADR 0004's "capture the non-backfillable thing now" reasoning does not transfer. `variantOf` records a user action that leaves no other trace; a base name is derivable from `name` minus known fragments by a script at any future date. It would just be an unused column.

`suggestVariantName` lives in `@fitnest/shared` alongside the vocabulary. Its one non-obvious input is the source Template's **primary target muscle**, which resolves the only fragment that cannot be read off an axis value: unilateral is named for the limb bearing the load — "One-Arm" or "Single-Leg" — and the value `unilateral` does not know which. Movement pattern is the tempting proxy and is measurably worse (**16/22** correct against the seeded library, vs **21/22** for primary muscle), because a pattern describes what the movement does rather than what holds the weight, and the two diverge in *both* directions: a Glute Kickback is `push` but is leg work, while a Turkish Get-Up is `squat`/`lunge` yet is defined by a weight held overhead in one arm. The residual miss is a one-arm kettlebell swing — hamstring-primary, held in one arm.

Resolving this fragment also pulled `MOVEMENT_PATTERNS` and `MUSCLE_GROUPS` into `@fitnest/shared`, with `api` building those two pre-existing `pgEnum`s from the shared tuples. Both migrations generate no schema change, so this is a refactor rather than a data decision — but it removes the last duplicated vocabulary between the packages.

The suggestion rule is **changed axes only, strip-then-prepend**: for each axis whose value differs from the source's, strip any known fragment for that axis out of the source name, then prepend the new value's fragment in fixed axis order. Unchanged axes contribute nothing. `"Bench Press"` (lying, bilateral) with `bodyPosition → incline` gives `"Incline Bench Press"`, the TODO's own example; `"Seated Calf Raise"` with `bodyPosition → standing` strips "Seated" and yields `"Standing Calf Raise"`. Considering only *changed* axes sidesteps the default-value problem: the default is per-movement, not per-axis (standing is default for a Row, lying for a Bench Press), and pinning that down would again require the base-movement concept ADR 0004 deferred.

## The seeded library is backfilled, and NULL means "no value on this axis"

`attachment` is the cautionary precedent: an optional descriptive column populated **zero** times across all 156 seeded exercises, useful to nobody. Filtering is only worth building if it works on day one, and every user is seeded.

So `bodyPosition` and `laterality` are filled for **all 156** seeded exercises, not just the 31 whose names announce it — a fragment only appears in a name when it is non-default, but `"Bench Press"` is still unambiguously lying and bilateral. The grip axes and `rangeOfMotion` stay NULL unless the movement is genuinely distinctive there (a Squat has no meaningful grip width). `NULL` therefore reads uniformly as *"this axis has no value for this movement"* and never as *"nobody got around to it"*.

The visible oddity this creates: `"Seated Calf Raise"` stores the word "Seated" in `name` **and** `bodyPosition = seated`. That redundancy is the direct price of advisory naming and is not a bug to normalise away.

## Where the vocabulary lives

`packages/api` and `packages/shared` are otherwise independent; only the two apps depend on both. The axis value tuples, the value→fragment map and `suggestName` live in `packages/shared` (a non-visual `constants/` concern), and `packages/api` imports the tuples to build its `pgEnum`s — `pgEnum` accepts a readonly string tuple, so `drizzle-zod` derives the same union types it would have otherwise. This creates a **new `api → shared` dependency edge**, which shared's role as "the design layer" did not previously anticipate; it is exposed through a dedicated subpath export so the standalone API server bundle never pulls in `tailwind-variants` or the theme code from shared's root index.

The alternative — pgEnum canonical in `api`, fragments duplicated in `shared` — keeps `api` dependency-free but leaves the value lists in two structurally unrelated copies, where adding an enum value and forgetting the fragment map is a silent gap typechecking cannot catch. Serving the vocabulary over tRPC was rejected outright: it puts a network round-trip and an offline failure mode in front of a pure formatting function over data the client already holds.

## Consequences

- Five new enum types and five nullable columns on `template_exercises` (migration `0001`, purely additive). Adding a sixth axis later is one enum + one nullable column — the same additive migration as the first five, so nothing here needs to be right the first time except the naming model.
- **`shared` must stay importable from CJS.** `drizzle-kit` resolves workspace packages through the CJS loader, so an `exports` entry declaring only `import`/`types` fails outright with `ERR_PACKAGE_PATH_NOT_EXPORTED` and migration generation stops. The `execution-attributes` subpath therefore also declares a `default` condition. This is safe only because the module is a leaf with no imports of its own; keep it that way.
- `suggestName` must tolerate names it cannot parse. It is advisory, so a miss costs the user one edit — it must never block or fail a clone.
- Nothing reads these columns outside the Library filter and the clone form. As with `variantOf`, that is deliberate.

## What the backfill found

The editorial pass over all 156 seeded exercises is done. Two things only became visible by doing it rather than designing it:

**`hanging` had to be added to Body Position.** Pull-ups, Dips, Ring Dips, Bench Dips, Muscle Up, Hanging Leg Raise and Hanging Pike — seven movements — are supported only by the arms, which is neither standing nor lying. The originally designed vocabulary had no honest value for them, and the alternative was seven nulls that would silently mean "unfilled", the exact semantic this ADR rules out.

**The distribution confirms every enum member earns its place.** Body position: `standing` 69, `lying` 31, `seated` 29, `bent-over` 10, `hanging` 7, `kneeling` 6, `decline` 2, `incline` 2. Laterality: `bilateral` 130, `unilateral` 22, `alternating` 4. No value is unused, so nothing in the vocabulary is speculative. Grip orientation (7 rows) and range of motion (3 rows) are sparse by design — they are set only where the movement is genuinely distinctive.

Judgment calls worth knowing about, since they are editorial rather than derivable: a Hyperextension is recorded as `bent-over` (the hinge is the salient fact, not that the torso is prone); `Push-Ups (Feet Elevated)` is `decline` rather than `lying`; Turkish Get-Ups are `lying` (where the movement starts) and `unilateral`.

Separately, the pass surfaced a **pre-existing data-quality problem this ADR does not fix**: the seeded library contains near-duplicate-looking entries — `Deadlift`/`Deadlifts`, `Lunge`/`Lunges`, `Shrug`/`Shrugs`, `Preacher Curl`/`Preacher Curls`, `Skull Crusher`/`Skullcrusher`, `Russian Twist`/`Russian Twists`, `Hip Adduction`/`Hip Adductions`, `Lying Tricep Extension`/`Lying Triceps Extension`, `Seated Palm-Up Wrist Curl`/`Seated Palms-Up Wrist Curl`. They were given identical *execution* attributes.

**Correction (see [ADR 0011](0011-backup-collections-and-slot-selection.md)):** calling these duplicates was wrong. Every pair differs in `equipment` — barbell vs. cable Deadlift, band vs. ez-bar Skull Crusher — so they are distinct Template Exercises under ADR 0003, and the plural was a collision artifact from stripping equipment out of seed names. Both members of each pair now carry their equipment as a name prefix; nothing was deleted.
