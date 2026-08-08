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

// Fixed dev user, referenced by context.ts's DEV_AUTH_BYPASS fallback.
export const DEV_USER_EMAIL = "dev@fitnest.local";

function mustGet<K, V>(map: Map<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Seed data missing expected key: ${String(key)}`);
  return value;
}

export type SeedExercise = {
  name: string;
  movementPattern: (typeof templateExercises.$inferInsert)["movementPattern"];
  equipment?: (typeof templateExercises.$inferInsert)["equipment"];
  muscles: { muscleGroup: string; role: "primary" | "secondary" }[];
};

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
        muscleGroup: m.muscleGroup as (typeof templateExerciseMuscles.$inferInsert)["muscleGroup"],
        role: m.role,
      })),
    );
  }

  // A couple of backup links, just so Exercise Detail has something to show.
  await db.insert(backupExercises).values([
    {
      templateExerciseId: mustGet(exerciseIds, "Barbell Bench Press - Medium Grip"),
      backupExerciseId: mustGet(exerciseIds, "Barbell Shoulder Press"),
      position: 0,
    },
    {
      templateExerciseId: mustGet(exerciseIds, "Pullups"),
      backupExerciseId: mustGet(exerciseIds, "Wide-Grip Lat Pulldown"),
      position: 0,
    },
  ]);

  const [plan] = await db
    .insert(fitnessPlans)
    .values({ userId: userId, name: "PPL 6-Week Hypertrophy", durationWeeks: 6 })
    .returning();
  if (!plan) throw new Error("Failed to insert plan");

  async function makeWorkout(
    name: string,
    prescriptions: { exercise: string; sets: { reps: number; load?: number }[] }[],
  ) {
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

  const pushDay = await makeWorkout("Push Day A", [
    {
      exercise: "Barbell Bench Press - Medium Grip",
      sets: [
        { reps: 8, load: 60 },
        { reps: 8, load: 60 },
        { reps: 8, load: 65 },
        { reps: 6, load: 65 },
      ],
    },
    {
      exercise: "Barbell Shoulder Press",
      sets: [
        { reps: 10, load: 35 },
        { reps: 10, load: 35 },
        { reps: 8, load: 37.5 },
      ],
    },
  ]);

  const pullDay = await makeWorkout("Pull Day A", [
    {
      exercise: "Bent Over Barbell Row",
      sets: [
        { reps: 8, load: 55 },
        { reps: 8, load: 55 },
        { reps: 8, load: 60 },
        { reps: 6, load: 60 },
      ],
    },
    { exercise: "Pullups", sets: [{ reps: 8 }, { reps: 8 }, { reps: 6 }] },
    {
      exercise: "Wide-Grip Lat Pulldown",
      sets: [
        { reps: 10, load: 45 },
        { reps: 10, load: 45 },
        { reps: 10, load: 45 },
      ],
    },
  ]);

  const legDay = await makeWorkout("Leg Day A", [
    {
      exercise: "Barbell Squat",
      sets: [
        { reps: 6, load: 80 },
        { reps: 6, load: 80 },
        { reps: 6, load: 85 },
        { reps: 5, load: 85 },
      ],
    },
    {
      exercise: "Romanian Deadlift",
      sets: [
        { reps: 10, load: 60 },
        { reps: 10, load: 60 },
        { reps: 10, load: 65 },
      ],
    },
    {
      exercise: "Barbell Walking Lunge",
      sets: [
        { reps: 10, load: 20 },
        { reps: 10, load: 20 },
        { reps: 10, load: 20 },
      ],
    },
  ]);

  await db.insert(planWorkouts).values([
    { planId: plan.id, workoutId: pushDay.id, position: 0 },
    { planId: plan.id, workoutId: pullDay.id, position: 1 },
    { planId: plan.id, workoutId: legDay.id, position: 2 },
  ]);

  // Logged history: this week (partial, for a realistic mixed-progress volume
  // panel) + last week (full) + three weeks ago (for the monthly view).
  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const sessions: { workout: typeof pushDay; daysAgo: number }[] = [
    { workout: pushDay, daysAgo: 1 },
    { workout: pullDay, daysAgo: 3 },
    { workout: legDay, daysAgo: 9 },
    { workout: pushDay, daysAgo: 10 },
    { workout: pullDay, daysAgo: 12 },
    { workout: legDay, daysAgo: 23 },
  ];

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
