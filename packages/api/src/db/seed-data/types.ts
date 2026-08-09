import type { templateExercises } from "../schema.js";

export type SeedExercise = {
  name: string;
  movementPattern: (typeof templateExercises.$inferInsert)["movementPattern"];
  equipment?: (typeof templateExercises.$inferInsert)["equipment"];
  muscles: { muscleGroup: string; role: "primary" | "secondary" }[];
};

export type SeedWorkout = {
  name: string;
  prescriptions: { exercise: string; sets: { reps: number; load?: number }[] }[];
};
