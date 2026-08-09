// Shapes for the static seed data. Every field is derived from the Drizzle
// schema's inferred insert types, so a schema change (a renamed column, a new
// enum member, a nullability flip) surfaces here as a type error rather than as
// a runtime failure during `db:seed`.
import type {
  fitnessPlans,
  prescribedSets,
  templateExerciseMuscles,
  templateExercises,
  workouts,
} from "../schema.js";

type TemplateExerciseInsert = typeof templateExercises.$inferInsert;
type TemplateExerciseMuscleInsert = typeof templateExerciseMuscles.$inferInsert;
type PrescribedSetInsert = typeof prescribedSets.$inferInsert;
type FitnessPlanInsert = typeof fitnessPlans.$inferInsert;
type WorkoutInsert = typeof workouts.$inferInsert;

/** A target-muscle row, minus the FK the seeder fills in. */
export type SeedExerciseMuscle = Pick<TemplateExerciseMuscleInsert, "muscleGroup" | "role">;

/** A Template Exercise, minus the FK/generated columns the seeder fills in. */
export type SeedExercise = Pick<
  TemplateExerciseInsert,
  "name" | "movementPattern" | "equipment"
> & {
  muscles: SeedExerciseMuscle[];
};

/** One prescribed set. `reps` is required here even though the column is
 *  nullable (null = AMRAP), because the seed data always specifies a target. */
export type SeedSet = {
  reps: NonNullable<PrescribedSetInsert["targetReps"]>;
  load?: NonNullable<PrescribedSetInsert["targetLoad"]>;
};

export type SeedPrescription = {
  exercise: SeedExercise["name"];
  sets: SeedSet[];
};

export type SeedWorkout = Pick<WorkoutInsert, "name"> & {
  prescriptions: SeedPrescription[];
};

export type SeedPlan = Pick<FitnessPlanInsert, "name" | "durationWeeks">;

export type SeedBackupLink = {
  exercise: SeedExercise["name"];
  backup: SeedExercise["name"];
};

export type SeedSession = {
  workout: SeedWorkout["name"];
  daysAgo: number;
};
