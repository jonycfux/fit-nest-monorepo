# Seeded Data Verification — Test Plan

Verifies that the fixed dev-user data produced by `packages/api/src/db/seed.ts` renders
correctly across the web-app: a ~156-exercise curated exercise library (derived from
free-exercise-db, see `packages/api/src/db/seed-data/exercises.ts`), 2 backup-exercise
links, 1 fitness plan ("PPL 6-Week Hypertrophy") with 3 workouts, and 6 logged workout
sessions. Since the library is large, these scenarios only assert on the handful of
exercises the seeded plan's workouts actually reference, not the full list.

**Assumptions (starting state for every scenario):** Postgres is migrated and freshly
seeded (`npm run db:migrate -w @fitnest/api` then `npm run db:seed -w @fitnest/api`), the
API is running with `DEV_AUTH_BYPASS=true` so every request is treated as the seeded
`dev@fitnest.local` user, and the web-app dev server is reachable at `/`. There is no
frontend login flow — each scenario navigates directly to its route.

## 1. Dashboard shows the seeded plan and set-volume data

1. Navigate to `/plans`.
2. **Expect:** a "Dashboard" heading is visible.
3. **Expect:** the "Your plans" section shows a link named "PPL 6-Week Hypertrophy" with
   the meta text "6 weeks · 3 workouts".
4. **Expect:** the "Set volume by muscle group" panel shows a row for each of chest,
   triceps, delts, quads, glutes, hamstrings, back, biceps, core — each with a non-empty
   set count — this confirms the 6 logged sessions were aggregated into volume data.
5. Toggle the period selector from "Weekly" to "Monthly".
6. **Expect:** the panel re-renders without error and still shows muscle-group rows
   (e.g. "chest").

## 2. Plan Builder shows the plan, exercise library, and each seeded workout

1. Navigate to `/plans`.
2. Click the "PPL 6-Week Hypertrophy" plan link.
3. **Expect:** the URL matches `/plans/{planId}`.
4. **Expect:** the page shows "Active plan: PPL 6-Week Hypertrophy".
5. **Expect:** the exercise library panel lists the exercises referenced by the seeded
   workouts (see Scenario 3's list), among the full curated library.
6. **Expect:** the workout dropdown contains options "Push Day A", "Pull Day A", and
   "Leg Day A".
7. Select "Push Day A" from the workout dropdown.
8. **Expect:** the cart header shows "Push Day A · 2 exercises" (Bench Press,
   Shoulder Press).
9. Select "Pull Day A" from the workout dropdown.
10. **Expect:** the cart header shows "Pull Day A · 3 exercises" (Bent Over Row,
    Pullups, Lat Pulldown).
11. Select "Leg Day A" from the workout dropdown.
12. **Expect:** the cart header shows "Leg Day A · 3 exercises" (Squat, Romanian
    Deadlift, Walking Lunge).

## 3. Exercise Library lists seeded template exercises

1. Navigate to `/library`.
2. **Expect:** an "Exercise Library" heading is visible.
3. **Expect:** the exercises referenced by the seeded workouts are visible as cards:
   Bench Press, Shoulder Press, Squat, Deadlift, Romanian Deadlift, Bent Over Row,
   Pullups, Lat Pulldown, Walking Lunge, Plank.
4. **Expect:** the "Bench Press" card shows a "push"
   movement-pattern badge, a "chest" primary-muscle badge (its only primary muscle —
   secondary muscles are not shown on the card, only on the detail page), and a
   "barbell" equipment badge.

## 4. Exercise detail shows seeded backup-exercise links

### 4a. Bench Press → Shoulder Press

1. Navigate to `/library`.
2. Click the "Bench Press" card.
3. **Expect:** a "Bench Press" heading is visible.
4. **Expect:** the "Backup exercises" panel shows "1 backups" and lists "Shoulder Press".

### 4b. Pullups → Lat Pulldown

1. Navigate to `/library`.
2. Click the "Pullups" card.
3. **Expect:** a "Pullups" heading is visible.
4. **Expect:** the "Backup exercises" panel shows "1 backups" and lists "Lat Pulldown".

## Out of scope

There is no dedicated Workouts list/detail page or Logged Workouts history page in the
web-app — `trpc.workouts.*` and `trpc.loggedWorkouts.*` exist on the backend but aren't
rendered standalone anywhere. Workout data is covered indirectly above: workout
names/exercise composition via the Plan Builder dropdown (Scenario 2), and the effect of
logged history via the Dashboard's volume panel (Scenario 1).

## Implementation

Implemented in `tests/seed.spec.ts`. The spec imports the seed definitions directly
(`packages/api/src/db/seed-data/exercises.ts` and `seed-data/plan.ts`) and derives its
assertions from them — exercise names, workout names, per-workout exercise counts, plan
name/duration, backup links, and the sample card's badges. Changing the seed data does
not require editing the test. Those modules are pure data with no DB imports, so the
test process never opens a Postgres connection.
