import { eq } from "drizzle-orm";
import type { DB } from "./client.js";
import {
  backupExercises,
  fitnessPlans,
  loggedExercises,
  loggedSets,
  loggedWorkouts,
  planWorkouts,
  prescribedExercises,
  prescribedSets,
  templateExerciseMuscles,
  templateExercises,
  workouts,
} from "./schema.js";
import { SEED_EXERCISES } from "./seed-data/exercises.js";
import { SEED_BACKUP_LINKS, SEED_PLAN, SEED_SESSIONS, SEED_WORKOUTS } from "./seed-data/plan.js";
import type { SeedWorkout } from "./seed-data/types.js";

/**
 * A transaction handle, or the pool itself. Every function here takes one so the
 * JIT provisioning path (context.ts) can run the whole seed inside a single
 * transaction — a half-seeded user would have an incomplete library and no retry
 * path, since provisioning only fires when the `users` row is missing.
 */
export type Tx = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];

function mustGet<K, V>(map: Map<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Seed data missing expected key: ${String(key)}`);
  return value;
}

/**
 * The Template Exercise library every user starts with — CONTEXT.md's "new users
 * are seeded with a copy of the classic exercises". Per ADR 0002 each user owns
 * their own copy; there is no shared catalog.
 */
async function seedExerciseLibrary(tx: Tx, userId: string): Promise<Map<string, string>> {
  const exerciseIds = new Map<string, string>();

  // Inserted in one statement per table rather than per row: this runs inline on
  // a user's first request after sign-up (ADR 0009), and ~156 round trips there
  // is the difference between a slow page and an unusable one.
  const rows = await tx
    .insert(templateExercises)
    .values(
      SEED_EXERCISES.map((ex) => ({
        userId,
        name: ex.name,
        movementPattern: ex.movementPattern,
        equipment: ex.equipment,
      })),
    )
    .returning({ id: templateExercises.id, name: templateExercises.name });

  for (const row of rows) exerciseIds.set(row.name, row.id);

  await tx.insert(templateExerciseMuscles).values(
    SEED_EXERCISES.flatMap((ex) =>
      ex.muscles.map((m) => ({
        templateExerciseId: mustGet(exerciseIds, ex.name),
        muscleGroup: m.muscleGroup,
        role: m.role,
      })),
    ),
  );

  await tx.insert(backupExercises).values(
    SEED_BACKUP_LINKS.map((link) => ({
      templateExerciseId: mustGet(exerciseIds, link.exercise),
      backupExerciseId: mustGet(exerciseIds, link.backup),
      position: 0,
    })),
  );

  return exerciseIds;
}

/**
 * The demo "PPL 6-Week Hypertrophy" plan plus six back-dated logged sessions.
 * Dev fixture only — real registrants never receive this (ADR 0009). Fabricated
 * sessions would show up as set volume for training the user never did.
 */
async function seedDemoPlan(tx: Tx, userId: string, exerciseIds: Map<string, string>) {
  const [plan] = await tx
    .insert(fitnessPlans)
    .values({ userId, name: SEED_PLAN.name, durationWeeks: SEED_PLAN.durationWeeks })
    .returning();
  if (!plan) throw new Error("Failed to insert plan");

  async function makeWorkout({ name, prescriptions }: SeedWorkout) {
    const [workout] = await tx.insert(workouts).values({ userId, name }).returning();
    if (!workout) throw new Error(`Failed to insert workout ${name}`);
    for (const [position, p] of prescriptions.entries()) {
      const [pe] = await tx
        .insert(prescribedExercises)
        .values({
          workoutId: workout.id,
          templateExerciseId: mustGet(exerciseIds, p.exercise),
          position,
        })
        .returning();
      if (!pe) throw new Error(`Failed to insert prescribed exercise ${p.exercise}`);
      await tx.insert(prescribedSets).values(
        p.sets.map((s, setPosition) => ({
          prescribedExerciseId: pe.id,
          position: setPosition,
          targetReps: s.reps,
          targetLoad: s.load,
        })),
      );
    }
    return workout;
  }

  const workoutsByName = new Map<string, { id: string }>();
  for (const def of SEED_WORKOUTS) {
    workoutsByName.set(def.name, await makeWorkout(def));
  }

  await tx.insert(planWorkouts).values(
    SEED_WORKOUTS.map((def, position) => ({
      planId: plan.id,
      workoutId: mustGet(workoutsByName, def.name).id,
      position,
    })),
  );

  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const session of SEED_SESSIONS) {
    const workout = mustGet(workoutsByName, session.workout);

    const workoutExercises = await tx
      .select()
      .from(prescribedExercises)
      .where(eq(prescribedExercises.workoutId, workout.id))
      .orderBy(prescribedExercises.position);
    const workoutSets = await tx
      .select()
      .from(prescribedSets)
      .innerJoin(
        prescribedExercises,
        eq(prescribedSets.prescribedExerciseId, prescribedExercises.id),
      )
      .where(eq(prescribedExercises.workoutId, workout.id));

    const [logged] = await tx
      .insert(loggedWorkouts)
      .values({
        userId,
        workoutId: workout.id,
        performedAt: new Date(now - session.daysAgo * DAY_MS),
      })
      .returning();
    if (!logged) throw new Error("Failed to insert logged workout");

    for (const pe of workoutExercises) {
      const [le] = await tx
        .insert(loggedExercises)
        .values({
          loggedWorkoutId: logged.id,
          templateExerciseId: pe.templateExerciseId,
          position: pe.position,
        })
        .returning();
      if (!le) throw new Error("Failed to insert logged exercise");

      const sets = workoutSets
        .filter((s) => s.prescribed_sets.prescribedExerciseId === pe.id)
        .map((s) => s.prescribed_sets);
      await tx.insert(loggedSets).values(
        sets.map((s, position) => ({
          loggedExerciseId: le.id,
          position,
          actualReps: s.targetReps,
          actualLoad: s.targetLoad,
        })),
      );
    }
  }

  return plan;
}

/**
 * Populate a freshly-created user's data. Called from two places:
 * - JIT provisioning on first authenticated request (`includeDemoPlan: false`)
 * - the `db:seed` dev script (`includeDemoPlan: true`)
 *
 * The caller owns the transaction and the `users` row.
 */
export async function seedUserData(
  tx: Tx,
  userId: string,
  { includeDemoPlan }: { includeDemoPlan: boolean },
) {
  const exerciseIds = await seedExerciseLibrary(tx, userId);
  if (includeDemoPlan) await seedDemoPlan(tx, userId, exerciseIds);
}
