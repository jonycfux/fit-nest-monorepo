import {
  BODY_POSITIONS,
  GRIP_ORIENTATIONS,
  GRIP_WIDTHS,
  LATERALITIES,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUPS,
  RANGES_OF_MOTION,
} from "@fitnest/shared/execution-attributes";
import { isNull } from "drizzle-orm";
import {
  type AnyPgColumn,
  foreignKey,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { normalizedName } from "./expressions.js";

// ---------------------------------------------------------------------------
// Global, system-owned enums.
// These are fixed reference vocabularies (universal anatomy / equipment), NOT
// per-user data — so a shared enum here does not violate the per-user rule.
// See docs/adr/0002 and docs/adr/0003.
// ---------------------------------------------------------------------------
export const movementPattern = pgEnum("movement_pattern", MOVEMENT_PATTERNS);

export const muscleGroup = pgEnum("muscle_group", MUSCLE_GROUPS);

export const muscleRole = pgEnum("muscle_role", ["primary", "secondary"]);

export const equipment = pgEnum("equipment", [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
  "kettlebell",
  "band",
  "foam-roller",
  "medicine-ball",
  "exercise-ball",
  "ez-bar",
]);

// Execution Attributes (ADR 0010): how the movement is executed. Intrinsic in the
// same sense `equipment` is — a different execution is a different Template
// Exercise — so they never diverge when prescribed or logged. Values come from
// `@fitnest/shared` so the apps' filter dropdowns and these enums cannot drift.
// Tempo is deliberately absent: it is a per-set prescription, so if it is ever
// wanted it belongs on `prescribedSets`, not here.
export const gripWidth = pgEnum("grip_width", GRIP_WIDTHS);
export const gripOrientation = pgEnum("grip_orientation", GRIP_ORIENTATIONS);
export const bodyPosition = pgEnum("body_position", BODY_POSITIONS);
export const laterality = pgEnum("laterality", LATERALITIES);
export const rangeOfMotion = pgEnum("range_of_motion", RANGES_OF_MOTION);

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------
// Clerk owns identity (credentials, sessions); this row owns *ownership* — it is
// the FK target every per-user table points at (ADR 0009). `clerkUserId` is the
// join between the two: the `sub` claim of a verified session token. The uuid PK
// stays the internal identifier so the domain model never depends on Clerk's id
// format. The seeded dev user gets a sentinel value (see db/seed.ts) because it
// has no Clerk account.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Template Exercise — the per-user movement library (the `Exercise` catalog).
// Owned by exactly one user (ADR 0002). Attributes live here at their owning
// level and are read live everywhere else (ADR 0003).
// ---------------------------------------------------------------------------
export const templateExercises = pgTable(
  "template_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Intrinsic movement attributes (ADR 0003).
    movementPattern: movementPattern("movement_pattern").notNull(),
    equipment: equipment("equipment"), // optional
    attachment: text("attachment"), // optional freeform modifier (rope, V-handle…)
    // Execution Attributes (ADR 0010). Every axis is optional, and null means the
    // axis has no value for this movement (a Squat has no grip width) — never
    // "unfilled". `bodyPosition`/`laterality` are therefore populated for the whole
    // seeded library, not just the exercises that name them.
    gripWidth: gripWidth("grip_width"),
    gripOrientation: gripOrientation("grip_orientation"),
    bodyPosition: bodyPosition("body_position"),
    laterality: laterality("laterality"),
    rangeOfMotion: rangeOfMotion("range_of_motion"),
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
  },
  (t) => [
    // A name is the library's only human-facing identifier — it is what every
    // picker, badge and panel renders — so two active Templates may not share
    // one. Case- and whitespace-insensitive, because "bench press" and "Bench
    // Press " are the same movement to everyone except `=`. Archived rows are
    // excluded: archiving is a soft delete, and an archived Template must not
    // squat on its name forever when there is no archive-management screen to
    // rename it from. Note this catches literal re-entry only — near-duplicates
    // like "Deadlift"/"Deadlifts" are a seed-data concern, not an index one.
    uniqueIndex("template_exercises_user_name_uq")
      .on(t.userId, normalizedName(t.name))
      .where(isNull(t.archivedAt)),
  ],
);

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

// `Backup Collection` — a named, ordered group of one Template Exercise's
// backups (ADR 0011). Owned by exactly one Template Exercise: Bench Press's
// "home gym" and Squat's "home gym" are unrelated rows that merely share a
// spelling.
//
// `name` is nullable and null means *the* default collection — the unnamed list
// every exercise's backups sat in before collections existed. That is why there
// is no nullable `collection_id`: the collection IS the list, so a link row
// always has one, and no NULL ever reaches an index.
export const backupCollections = pgTable(
  "backup_collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateExerciseId: uuid("template_exercise_id")
      .notNull()
      .references(() => templateExercises.id, { onDelete: "cascade" }),
    name: text("name"), // null = the unnamed default collection
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // Two collections on one exercise may not share a name, matched the same
    // case- and whitespace-insensitively as Template names.
    uniqueIndex("backup_collections_name_uq").on(t.templateExerciseId, normalizedName(t.name)),
    // Postgres treats NULLs as distinct in a unique index, so the index above
    // would happily allow an exercise two unnamed collections. This pins the
    // "null = *the* default" reading: at most one per exercise.
    uniqueIndex("backup_collections_one_default_uq").on(t.templateExerciseId).where(isNull(t.name)),
    // Target for the composite FK on `prescribed_exercises`, which is what makes
    // pointing a slot at another exercise's collection impossible in the DB.
    unique("backup_collections_exercise_id_uq").on(t.templateExerciseId, t.id),
  ],
);

// Backup exercises: an ordered, directional self-reference among a user's
// Template Exercises (CONTEXT.md → Backup Exercise), grouped into collections.
// `position` is scoped per collection, and the same backup may appear in several
// of an exercise's collections — Dumbbell Bench Press belongs to Bench Press's
// "home gym" and its "commercial gym" alike, which the old
// PK(template_exercise_id, backup_exercise_id) made impossible.
export const backupExercises = pgTable(
  "backup_exercises",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => backupCollections.id, { onDelete: "cascade" }),
    backupExerciseId: uuid("backup_exercise_id")
      .notNull()
      .references(() => templateExercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.backupExerciseId] })],
);

// ---------------------------------------------------------------------------
// Planning side (the prescription). Composed BY REFERENCE via join tables so a
// user authors once and reuses; edits propagate (ADR 0001).
// ---------------------------------------------------------------------------

// `Plan` (the noun). Owned by exactly one user (ADR 0002).
export const fitnessPlans = pgTable("fitness_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  durationWeeks: integer("duration_weeks").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// `Workout` — a per-user, reusable grouping of exercises (ADR 0002).
export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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
export const prescribedExercises = pgTable(
  "prescribed_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    templateExerciseId: uuid("template_exercise_id")
      .notNull()
      .references(() => templateExercises.id),
    position: integer("position").notNull(),
    note: text("note"), // Prescribed-level note (ADR 0003)
    // Slot-specific backups (ADR 0011). The slot *selects* one of its Template's
    // collections; it never owns backup content, so ADR 0003's rule holds and
    // editing the collection propagates to every slot pointing at it. Null =
    // fall back to the Template's default collection.
    backupCollectionId: uuid("backup_collection_id"),
  },
  (t) => [
    // Composite FK: the chosen collection must belong to THIS slot's Template.
    // MATCH SIMPLE (the default) means the constraint is simply not enforced
    // while `backupCollectionId` is null, which is exactly the fallback case.
    // No ON DELETE action — `SET NULL` would try to null the NOT NULL
    // `template_exercise_id` too, so deleting a collection nulls referencing
    // slots in the same transaction instead (see the backupCollections router).
    foreignKey({
      columns: [t.templateExerciseId, t.backupCollectionId],
      foreignColumns: [backupCollections.templateExerciseId, backupCollections.id],
      name: "prescribed_exercises_backup_collection_fk",
    }),
  ],
);

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
    .references(() => users.id, { onDelete: "cascade" }),
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

export const insertBackupCollectionSchema = createInsertSchema(backupCollections);
export const selectBackupCollectionSchema = createSelectSchema(backupCollections);
