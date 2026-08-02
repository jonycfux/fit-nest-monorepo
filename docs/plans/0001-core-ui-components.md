# Core UI Components — Implementation Plan

Source: design handoff at `~/Downloads/design_handoff_fitnest_core_components` (README, `tokens/`, `screenshots/`, `.dc.html` visual references). Covers six screens — Dashboard, Plan Builder, Exercise Library, Exercise Detail, Exercise Edit, Active Workout — on both `@fitnest/web-app` and `@fitnest/mobile-app`.

Decisions below came out of a grilling session; see [ADR 0006](../adr/0006-active-workout-client-local-draft.md) and [ADR 0007](../adr/0007-per-platform-ui-wrapper-components.md) for the two that met the ADR bar.

## Sequencing

**Web first, end-to-end, then port to mobile.** Web already has a router (TanStack Router) and faster iteration (Vite HMR); mobile has no navigation library installed at all. Bottoming out screen logic and state model once on web avoids inventing every decision twice under time pressure, and lets mobile work start from a proven pattern instead of a blank slate.

Within each platform: primitives first (nothing renders without them), then screens in dependency order — Library/Detail/Edit (self-contained, exercises the primitive set) → Dashboard (needs plan data + the draft-persistence layer) → Plan Builder (needs the cart draft + the new workout picker) → Active Workout (needs the draft layer, built last since Dashboard/Builder both feed into it).

## Layer 1 — Primitives

`@fitnest/shared` gains new `tv()` variant families (following the existing `buttonVariants`/`textVariants` pattern) for: `badgeVariants` (tones: primary, info, neutral, success/warning/danger for the volume bars), `panelWindowVariants` (the chrome-bar container), `inputVariants`, `checkboxVariants`, plus any layout-only classes needed by cards/rows. No component code lives in `@fitnest/shared` — see ADR 0007.

Each app gets a `src/ui/` folder (new) of thin wrappers applying those variants to its own primitive:

| Component | Web primitive | Mobile primitive |
|---|---|---|
| Badge | `<span>` | `<View><Text>` |
| PanelWindow | `<div>` | `<View>` |
| IconButton | `<button>` + `lucide-react` | `<Pressable>` + `lucide-react-native` |
| Input | `<input>` | `<TextInput>` |
| Select | native `<select>` | **custom dropdown** (Pressable trigger + overlay list — no native RN select, and a native OS picker would break the design's pixel-fidelity requirement) |
| Checkbox | `<input type=checkbox>` styled | `<Pressable>` custom box |
| Stepper (−/+) | two IconButtons | two IconButtons |

Icons: mobile adds `lucide-react-native` (same glyph set and prop API as web's existing `lucide-react` — the handoff's icon names, e.g. `layout-dashboard`, `flame`, `pencil`, map 1:1).

Hover/press states (`brightness(1.12)` hover, `scale(0.97)` press, 100–240ms `cubic-bezier(0.2,0,0,1)`) are implemented once per platform at the primitive level (web: CSS `:hover`/`:active` via Tailwind; mobile: `Pressable`'s `style` callback), not per screen.

## Layer 2 — Routing & navigation shell

**Web** (TanStack Router, file-based): a new `_shell` layout route wraps the sidebar around everything, with dynamic nested routes:
- `_shell.plans.tsx` — Dashboard (replaces the current `/plans` stub)
- `_shell.plans.$planId.tsx` — Plan Builder, scoped to that plan
- `_shell.library.tsx` — Exercise Library
- `_shell.library.$exerciseId.tsx` — Exercise Detail
- `_shell.library.$exerciseId.edit.tsx` — Exercise Edit
- `_shell.active.tsx` — Active Workout

Sidebar nav links are static hrefs to the index routes (`/plans`, `/library`, `/active`) — clicking a sidebar item always lands on the list/landing view for that section, regardless of how deep you were in a detail route. This is a router-level property (links don't carry `$planId`/`$exerciseId` forward), not extra logic.

**Mobile** (Expo Router, new dependency): mirrors the same shape via tab + stack groups — `app/(tabs)/plans/index.tsx`, `app/(tabs)/plans/[planId].tsx`, `app/(tabs)/library/index.tsx`, `app/(tabs)/library/[exerciseId].tsx`, `app/(tabs)/library/[exerciseId]/edit.tsx`, `app/(tabs)/active.tsx`. Unlike the web sidebar, **each tab preserves its own stack** when switching away and back (standard iOS/Expo Router convention); tapping the already-focused tab pops it to root. This deliberately differs from web's always-reset sidebar behavior — they're different platform idioms, not the same rule expressed twice.

**Exercise Edit return target:** Save/Cancel return to wherever Edit was entered from (Plan Builder or Detail) via router history, not a hardcoded destination — resolves an ambiguity in the handoff text (which describes only the Detail→Edit path).

## Layer 3 — State & data

**Real tRPC everywhere an endpoint exists** (`plans.list/byId/create`, `workouts.byId/create/setExercises`, `templateExercises.*`), matching the existing `/plans` stub's pattern. Two gaps get small, explicit backend additions:

1. **Dashboard volume-by-muscle-group panel** — new `dashboard.volumeByMuscleGroup` query (or similar), aggregating `loggedSets` → `loggedExercises` → `templateExerciseMuscles` over the selected period (weekly: 12 sets/muscle target; monthly: 48). Bar color is actual/target ratio (≥0.9 success, ≥0.6 warning, else danger); bar width is relative to the max row in the current view.
2. **Active Workout live progress** — no new table. See ADR 0006: a client-local draft (`localStorage`/`AsyncStorage`, per-user key) holds `{ workoutId, exercises, startedAt }`, seeded from the Workout's prescription (`workouts.byId`) if no draft exists, cleared on successful `loggedWorkouts.create`. The Dashboard's "Continue" panel reflects this draft directly and only appears when one exists — no scheduling logic, no guessing "today's workout."

**Draft conflict:** starting a new workout while one is already in progress shows a confirm dialog ("progress on X will be discarded") rather than a hard block.

**Plan Builder cart** uses the same storage-backed draft pattern (`{ planId, workoutId | null, items }`) so it survives navigating to Exercise Edit and back (a real route change, not just component state) and page refresh. Cleared on successful Save.

## Layer 4 — Screens

### Exercise Library, Detail, Edit
Straightforward CRUD-adjacent screens over `templateExercises.*`. Detail has no archive/restore action (removed by design — archiving applies to Plans only, per the handoff and CONTEXT.md's Template Exercise entry).

### Dashboard
Volume panel (new aggregation endpoint above) + Continue panel (draft-driven, see Layer 3) + plan list (`plans.list`). "New plan" button is **out of scope for this plan** — no design exists for it; left as a visible no-op/TODO rather than inventing an undesigned flow.

### Plan Builder
Scoped to one Plan (`$planId`). Adds a **Workout picker** not present in the original handoff screens (identified during grilling as a real gap — the design shows no way to select which Workout within a plan you're editing): a Select at the top of the cart pane listing the plan's existing Workouts + a "New workout" option.
- Existing workout selected → loads its cart via `workouts.byId`, editable, Save calls `workouts.setExercises`.
- "New workout" → empty cart, Save calls `workouts.create` then `plans.setWorkouts` (append).
- Pencil icon on any catalog exercise → Exercise Edit, pre-filled, returns to Builder on Save/Cancel (return-to-origin, Layer 2).
- "Immediately start an active workout after save" checkbox chains into seeding the Active Workout draft.

### Active Workout
Renders from the current draft (Layer 3). Per-exercise panel with a set table (`#` / target / actual / done), session-level "N / M sets logged" readout. Finishing calls `loggedWorkouts.create` and clears the draft.

## Explicitly out of scope for this plan

- "New plan" creation flow (no design exists).
- Editing an existing Workout's exercises from anywhere other than Plan Builder (the new picker covers the one gap identified; a general "workout management" surface is a separate future pass).
- Automated tests (unit/component or E2E) — a separate follow-up once screens are stable. The repo's Playwright E2E agents (added `8063b9f`) are available when that pass happens.
- Cross-device / server-persisted Active Workout progress (see ADR 0006) — client-local only for now.
- Named backup collections (pre-existing parking-lot item, unrelated to this handoff — see project memory `parking-lot-backup-collections`).

## Decision log (grilling session)

| # | Decision | Answer |
|---|---|---|
| 1 | Plan scope | Primitives + full screens together |
| 2 | Platform sequencing | Web fully first, then port to mobile |
| 3 | Component architecture | Cross the deferred line — app-local `ui/` wrappers now (ADR 0007) |
| 4 | Data wiring | Real tRPC where it exists; small backend additions for the two gaps |
| 5 | Mobile navigation | Expo Router |
| 6 | Web routing | Dynamic nested routes under a `_shell` layout; sidebar always links to index routes |
| 7 | Mobile tab behavior | Preserve per-tab stack (standard mobile convention), reset only on re-tap |
| 8 | Mobile icons | `lucide-react-native` |
| 9 | Exercise Edit return target | Return to origin (router history), not always Detail |
| 10 | "New plan" flow | Out of scope |
| 11 | Plan Builder scope | Add a Workout picker/editor (real gap vs. handoff) |
| 12 | Workout picker UI | Select dropdown: existing workouts + "New workout" |
| 13 | Dashboard "Continue" logic | Reflects real in-progress drafts only, no schedule-guessing |
| 14 | Active-workout draft persistence | Storage-backed (ADR 0006) |
| 15 | Draft conflict (starting a 2nd workout) | Confirm-and-replace |
| 16 | Plan Builder cart persistence | Same storage-backed pattern as the active-workout draft |
| 17 | Testing scope | No tests in this plan (separate follow-up) |
| 18 | Mobile Select | Custom in-app dropdown, not a native picker |
| 19 | Plan doc location | `docs/plans/0001-core-ui-components.md` |
