import { eq } from "drizzle-orm";
import { db } from "./client.js";
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
  users,
  workouts,
} from "./schema.js";
import { SEED_EXERCISES } from "./seed-data/exercises.js";
import { SEED_BACKUP_LINKS, SEED_PLAN, SEED_SESSIONS, SEED_WORKOUTS } from "./seed-data/plan.js";
import type { SeedExercise, SeedWorkout } from "./seed-data/types.js";

// Fixed dev user, referenced by context.ts's DEV_AUTH_BYPASS fallback.
export const DEV_USER_EMAIL = "dev@fitnest.local";

function mustGet<K, V>(map: Map<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Seed data missing expected key: ${String(key)}`);
  return value;
}

const EXERCISES: SeedExercise[] = SEED_EXERCISES;

async function seed() {
  const [existing] = await db.select().from(users).where(eq(users.email, DEV_USER_EMAIL));
  if (existing) {
    console.log(`Dev user already seeded (${existing.id}). Skipping.`);
    return;
  }

  const [user] = await db
    .insert(users)
    .values({ email: DEV_USER_EMAIL, name: "Dev User" })
    .returning();
  if (!user) throw new Error("Failed to insert dev user");
  const userId = user.id;

  const exerciseIds = new Map<string, string>();
  for (const ex of EXERCISES) {
    const [row] = await db
      .insert(templateExercises)
      .values({
        userId: userId,
        name: ex.name,
        movementPattern: ex.movementPattern,
        equipment: ex.equipment,
      })
      .returning();
    if (!row) throw new Error(`Failed to insert exercise ${ex.name}`);
    exerciseIds.set(ex.name, row.id);
    await db.insert(templateExerciseMuscles).values(
      ex.muscles.map((m) => ({
        templateExerciseId: row.id,
        muscleGroup: m.muscleGroup,
        role: m.role,
      })),
    );
  }

  await db.insert(backupExercises).values(
    SEED_BACKUP_LINKS.map((link) => ({
      templateExerciseId: mustGet(exerciseIds, link.exercise),
      backupExerciseId: mustGet(exerciseIds, link.backup),
      position: 0,
    })),
  );

  const [plan] = await db
    .insert(fitnessPlans)
    .values({ userId: userId, name: SEED_PLAN.name, durationWeeks: SEED_PLAN.durationWeeks })
    .returning();
  if (!plan) throw new Error("Failed to insert plan");

  async function makeWorkout({ name, prescriptions }: SeedWorkout) {
    const [workout] = await db.insert(workouts).values({ userId: userId, name }).returning();
    if (!workout) throw new Error(`Failed to insert workout ${name}`);
    for (const [position, p] of prescriptions.entries()) {
      const [pe] = await db
        .insert(prescribedExercises)
        .values({
          workoutId: workout.id,
          templateExerciseId: mustGet(exerciseIds, p.exercise),
          position,
        })
        .returning();
      if (!pe) throw new Error(`Failed to insert prescribed exercise ${p.exercise}`);
      await db.insert(prescribedSets).values(
        p.sets.map((s, position) => ({
          prescribedExerciseId: pe.id,
          position,
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

  await db.insert(planWorkouts).values(
    SEED_WORKOUTS.map((def, position) => ({
      planId: plan.id,
      workoutId: mustGet(workoutsByName, def.name).id,
      position,
    })),
  );

  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const sessions = SEED_SESSIONS.map((s) => ({
    workout: mustGet(workoutsByName, s.workout),
    daysAgo: s.daysAgo,
  }));

  for (const session of sessions) {
    const workoutExercises = await db
      .select()
      .from(prescribedExercises)
      .where(eq(prescribedExercises.workoutId, session.workout.id))
      .orderBy(prescribedExercises.position);
    const workoutSets = await db
      .select()
      .from(prescribedSets)
      .innerJoin(
        prescribedExercises,
        eq(prescribedSets.prescribedExerciseId, prescribedExercises.id),
      )
      .where(eq(prescribedExercises.workoutId, session.workout.id));

    const [logged] = await db
      .insert(loggedWorkouts)
      .values({
        userId: userId,
        workoutId: session.workout.id,
        performedAt: new Date(now - session.daysAgo * DAY_MS),
      })
      .returning();
    if (!logged) throw new Error("Failed to insert logged workout");

    for (const pe of workoutExercises) {
      const [le] = await db
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
      await db.insert(loggedSets).values(
        sets.map((s, position) => ({
          loggedExerciseId: le.id,
          position,
          actualReps: s.targetReps,
          actualLoad: s.targetLoad,
        })),
      );
    }
  }

  console.log(`Seeded dev user ${user.id} (${DEV_USER_EMAIL}) with plan "${plan.name}".`);
}

// Only run when invoked directly (`npm run db:seed`) — importing DEV_USER_EMAIL
// from context.ts must not trigger seeding on every server boot.
if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
