import {
  type AnyPgColumn,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ---------------------------------------------------------------------------
// Global, system-owned enums.
// These are fixed reference vocabularies (universal anatomy / equipment), NOT
// per-user data — so a shared enum here does not violate the per-user rule.
// See docs/adr/0002 and docs/adr/0003.
// ---------------------------------------------------------------------------
export const movementPattern = pgEnum("movement_pattern", [
  "push",
  "pull",
  "squat",
  "hinge",
  "lunge",
  "carry",
  "core",
]);

export const muscleGroup = pgEnum("muscle_group", [
  "chest",
  "back",
  "quads",
  "hamstrings",
  "glutes",
  "delts",
  "biceps",
  "triceps",
  "calves",
  "core",
  "forearms",
  "traps",
]);

export const muscleRole = pgEnum("muscle_role", ["primary", "secondary"]);

export const equipment = pgEnum("equipment", [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
  "kettlebell",
  "band",
]);

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Template Exercise — the per-user movement library (the `Exercise` catalog).
// Owned by exactly one user (ADR 0002). Attributes live here at their owning
// level and are read live everywhere else (ADR 0003).
// ---------------------------------------------------------------------------
export const templateExercises = pgTable("template_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  // Intrinsic movement attributes (ADR 0003).
  movementPattern: movementPattern("movement_pattern").notNull(),
  equipment: equipment("equipment"), // optional
  attachment: text("attachment"), // optional freeform modifier (rope, V-handle…)
  note: text("note"), // optional Template-level cue
  // ADR 0004: immutable breadcrumb to the immediate clone source. No behavior;
  // set-null if the source is ever hard-deleted.
  variantOf: uuid("variant_of").references((): AnyPgColumn => templateExercises.id, {
    onDelete: "set null",
  }),
  // ADR 0001: soft-delete. A Template Exercise with history is Archived, never
  // hard-deleted. null = active.
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Target muscles: a role-tagged (primary/secondary) many-to-many against the
// global muscle-group enum (ADR 0003). >=1 primary is enforced at the app level.
export const templateExerciseMuscles = pgTable(
  "template_exercise_muscles",
  {
    templateExerciseId: uuid("template_exercise_id")
      .notNull()
      .references(() => templateExercises.id, { onDelete: "cascade" }),
    muscleGroup: muscleGroup("muscle_group").notNull(),
    role: muscleRole("role").notNull(),
  },
  (t) => [primaryKey({ columns: [t.templateExerciseId, t.muscleGroup] })],
);

// Backup exercises: an ordered, directional self-reference among a user's
// Template Exercises (CONTEXT.md → Backup Exercise). Kept flat and additive-
// compatible with future named backup collections (a nullable collection_id).
export const backupExercises = pgTable(
  "backup_exercises",
  {
    templateExerciseId: uuid("template_exercise_id")
      .notNull()
      .references(() => templateExercises.id, { onDelete: "cascade" }),
    backupExerciseId: uuid("backup_exercise_id")
      .notNull()
      .references(() => templateExercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.templateExerciseId, t.backupExerciseId] })],
);

// ---------------------------------------------------------------------------
// Planning side (the prescription). Composed BY REFERENCE via join tables so a
// user authors once and reuses; edits propagate (ADR 0001).
// ---------------------------------------------------------------------------

// `Plan` (the noun). Pre-existing table, left as the ADR-0002-sanctioned
// placeholder: user_id stays nullable until identity/auth lands, at which point
// it tightens to NOT NULL alongside the public → per-user handlers.
export const fitnessPlans = pgTable("fitness_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  durationWeeks: integer("duration_weeks").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// `Workout` — a per-user, reusable grouping of exercises (ADR 0002).
export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Plan → Workout, ordered (scheduling deferred — this is an ordered collection).
export const planWorkouts = pgTable(
  "plan_workouts",
  {
    planId: uuid("plan_id")
      .notNull()
      .references(() => fitnessPlans.id, { onDelete: "cascade" }),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.workoutId] })],
);

// `Prescribed Exercise` — a Template Exercise placed in a Workout at an order
// position, owning its Prescribed Sets. References the Template live (no cascade
// — Templates are archived, not hard-deleted, when referenced).
export const prescribedExercises = pgTable("prescribed_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutId: uuid("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  templateExerciseId: uuid("template_exercise_id")
    .notNull()
    .references(() => templateExercises.id),
  position: integer("position").notNull(),
  note: text("note"), // Prescribed-level note (ADR 0003)
});

// `Prescribed Set` — one target line; per-set (not scalar sets×reps).
export const prescribedSets = pgTable("prescribed_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  prescribedExerciseId: uuid("prescribed_exercise_id")
    .notNull()
    .references(() => prescribedExercises.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  targetReps: integer("target_reps"), // null = AMRAP
  targetLoad: numeric("target_load", { precision: 6, scale: 2, mode: "number" }),
  targetRpe: numeric("target_rpe", { precision: 3, scale: 1, mode: "number" }),
});

// ---------------------------------------------------------------------------
// Performance side (what actually happened). Performed-only: no prescription
// snapshot, no runtime link to Prescribed Sets, no adherence (ADR 0001).
// ---------------------------------------------------------------------------

// `Logged Workout` — a performed instance. Optional origin Workout (used only to
// pre-populate the logging screen); set-null so the log survives origin deletion.
export const loggedWorkouts = pgTable("logged_workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  workoutId: uuid("workout_id").references(() => workouts.id, {
    onDelete: "set null",
  }),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// `Logged Exercise` — one Template Exercise performed within a Logged Workout,
// referenced live. Mirrors Prescribed Exercise.
export const loggedExercises = pgTable("logged_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  loggedWorkoutId: uuid("logged_workout_id")
    .notNull()
    .references(() => loggedWorkouts.id, { onDelete: "cascade" }),
  templateExerciseId: uuid("template_exercise_id")
    .notNull()
    .references(() => templateExercises.id),
  position: integer("position").notNull(),
  note: text("note"), // Logged-level note (ADR 0003)
});

// `Logged Set` — actual reps and load for one set. No RPE, no set-level note.
export const loggedSets = pgTable("logged_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  loggedExerciseId: uuid("logged_exercise_id")
    .notNull()
    .references(() => loggedExercises.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  actualReps: integer("actual_reps"),
  actualLoad: numeric("actual_load", { precision: 6, scale: 2, mode: "number" }),
});

// ---------------------------------------------------------------------------
// drizzle-zod — the DB schema is the single source of truth that also drives
// tRPC input validation. Insert/select schemas for the aggregate roots; child
// tables derive theirs the same way when their routers are built.
// ---------------------------------------------------------------------------
export const insertFitnessPlanSchema = createInsertSchema(fitnessPlans);
export const selectFitnessPlanSchema = createSelectSchema(fitnessPlans);

export const insertTemplateExerciseSchema = createInsertSchema(templateExercises);
export const selectTemplateExerciseSchema = createSelectSchema(templateExercises);

export const insertWorkoutSchema = createInsertSchema(workouts);
export const selectWorkoutSchema = createSelectSchema(workouts);

export const insertLoggedWorkoutSchema = createInsertSchema(loggedWorkouts);
export const selectLoggedWorkoutSchema = createSelectSchema(loggedWorkouts);

// Child-table schemas — pick their fields for nested router inputs.
export const insertTemplateExerciseMuscleSchema = createInsertSchema(templateExerciseMuscles);
export const insertPrescribedExerciseSchema = createInsertSchema(prescribedExercises);
export const insertPrescribedSetSchema = createInsertSchema(prescribedSets);
export const insertLoggedExerciseSchema = createInsertSchema(loggedExercises);
export const insertLoggedSetSchema = createInsertSchema(loggedSets);
