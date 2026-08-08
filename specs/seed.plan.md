# Seeded Data Verification — Test Plan

Verifies that the fixed dev-user data produced by `packages/api/src/db/seed.ts` renders
correctly across the web-app: 10 template exercises, 2 backup-exercise links, 1 fitness
plan ("PPL 6-Week Hypertrophy") with 3 workouts, and 6 logged workout sessions.

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
4. **Expect:** the "Set volume by muscle group" panel shows a row for every muscle group
   present in the seeded exercises (chest, triceps, delts, quads, glutes, hamstrings,
   back, biceps, core), each with a non-empty set count — this confirms the 6 logged
   sessions were aggregated into volume data.
5. Toggle the period selector from "Weekly" to "Monthly".
6. **Expect:** the panel re-renders without error and still shows muscle-group rows
   (e.g. "chest").

## 2. Plan Builder shows the plan, exercise library, and each seeded workout

1. Navigate to `/plans`.
2. Click the "PPL 6-Week Hypertrophy" plan link.
3. **Expect:** the URL matches `/plans/{planId}`.
4. **Expect:** the page shows "Active plan: PPL 6-Week Hypertrophy".
5. **Expect:** the exercise library panel lists all 10 seeded exercise names.
6. **Expect:** the workout dropdown contains options "Push Day A", "Pull Day A", and
   "Leg Day A".
7. Select "Push Day A" from the workout dropdown.
8. **Expect:** the cart header shows "Push Day A · 2 exercises" (Bench Press, Overhead
   Press).
9. Select "Pull Day A" from the workout dropdown.
10. **Expect:** the cart header shows "Pull Day A · 3 exercises" (Row, Pull-up, Lat
    Pulldown).
11. Select "Leg Day A" from the workout dropdown.
12. **Expect:** the cart header shows "Leg Day A · 3 exercises" (Squat, Romanian
    Deadlift, Walking Lunge).

## 3. Exercise Library lists all seeded template exercises

1. Navigate to `/library`.
2. **Expect:** an "Exercise Library" heading is visible.
3. **Expect:** all 10 seeded exercise names are visible as cards: Barbell Bench Press,
   Overhead Press, Barbell Back Squat, Conventional Deadlift, Romanian Deadlift, Barbell
   Row, Pull-up, Lat Pulldown, Dumbbell Walking Lunge, Plank.
4. **Expect:** the "Barbell Bench Press" card shows a "push" movement-pattern badge, a
   "chest" primary-muscle badge (its only primary muscle — secondary muscles are not
   shown on the card, only on the detail page), and a "barbell" equipment badge.

## 4. Exercise detail shows seeded backup-exercise links

### 4a. Barbell Bench Press → Overhead Press

1. Navigate to `/library`.
2. Click the "Barbell Bench Press" card.
3. **Expect:** a "Barbell Bench Press" heading is visible.
4. **Expect:** the "Backup exercises" panel shows "1 backups" and lists "Overhead
   Press".

### 4b. Pull-up → Lat Pulldown

1. Navigate to `/library`.
2. Click the "Pull-up" card.
3. **Expect:** a "Pull-up" heading is visible.
4. **Expect:** the "Backup exercises" panel shows "1 backups" and lists "Lat Pulldown".

## Out of scope

There is no dedicated Workouts list/detail page or Logged Workouts history page in the
web-app — `trpc.workouts.*` and `trpc.loggedWorkouts.*` exist on the backend but aren't
rendered standalone anywhere. Workout data is covered indirectly above: workout
names/exercise composition via the Plan Builder dropdown (Scenario 2), and the effect of
logged history via the Dashboard's volume panel (Scenario 1).

## Implementation

Implemented in `tests/seed.spec.ts`.
