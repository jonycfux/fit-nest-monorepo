CREATE TYPE "public"."equipment" AS ENUM('barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'band');--> statement-breakpoint
CREATE TYPE "public"."movement_pattern" AS ENUM('push', 'pull', 'squat', 'hinge', 'lunge', 'carry', 'core');--> statement-breakpoint
CREATE TYPE "public"."muscle_group" AS ENUM('chest', 'back', 'quads', 'hamstrings', 'glutes', 'delts', 'biceps', 'triceps', 'calves', 'core', 'forearms', 'traps');--> statement-breakpoint
CREATE TYPE "public"."muscle_role" AS ENUM('primary', 'secondary');--> statement-breakpoint
CREATE TABLE "backup_exercises" (
	"template_exercise_id" uuid NOT NULL,
	"backup_exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "backup_exercises_template_exercise_id_backup_exercise_id_pk" PRIMARY KEY("template_exercise_id","backup_exercise_id")
);
--> statement-breakpoint
CREATE TABLE "fitness_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"duration_weeks" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logged_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logged_workout_id" uuid NOT NULL,
	"template_exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "logged_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logged_exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"actual_reps" integer,
	"actual_load" numeric(6, 2)
);
--> statement-breakpoint
CREATE TABLE "logged_workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workout_id" uuid,
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_workouts" (
	"plan_id" uuid NOT NULL,
	"workout_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "plan_workouts_plan_id_workout_id_pk" PRIMARY KEY("plan_id","workout_id")
);
--> statement-breakpoint
CREATE TABLE "prescribed_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"template_exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "prescribed_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescribed_exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"target_reps" integer,
	"target_load" numeric(6, 2),
	"target_rpe" numeric(3, 1)
);
--> statement-breakpoint
CREATE TABLE "template_exercise_muscles" (
	"template_exercise_id" uuid NOT NULL,
	"muscle_group" "muscle_group" NOT NULL,
	"role" "muscle_role" NOT NULL,
	CONSTRAINT "template_exercise_muscles_template_exercise_id_muscle_group_pk" PRIMARY KEY("template_exercise_id","muscle_group")
);
--> statement-breakpoint
CREATE TABLE "template_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"movement_pattern" "movement_pattern" NOT NULL,
	"equipment" "equipment",
	"attachment" text,
	"note" text,
	"variant_of" uuid,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "backup_exercises" ADD CONSTRAINT "backup_exercises_template_exercise_id_template_exercises_id_fk" FOREIGN KEY ("template_exercise_id") REFERENCES "public"."template_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_exercises" ADD CONSTRAINT "backup_exercises_backup_exercise_id_template_exercises_id_fk" FOREIGN KEY ("backup_exercise_id") REFERENCES "public"."template_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitness_plans" ADD CONSTRAINT "fitness_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logged_exercises" ADD CONSTRAINT "logged_exercises_logged_workout_id_logged_workouts_id_fk" FOREIGN KEY ("logged_workout_id") REFERENCES "public"."logged_workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logged_exercises" ADD CONSTRAINT "logged_exercises_template_exercise_id_template_exercises_id_fk" FOREIGN KEY ("template_exercise_id") REFERENCES "public"."template_exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logged_sets" ADD CONSTRAINT "logged_sets_logged_exercise_id_logged_exercises_id_fk" FOREIGN KEY ("logged_exercise_id") REFERENCES "public"."logged_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logged_workouts" ADD CONSTRAINT "logged_workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logged_workouts" ADD CONSTRAINT "logged_workouts_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_workouts" ADD CONSTRAINT "plan_workouts_plan_id_fitness_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."fitness_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_workouts" ADD CONSTRAINT "plan_workouts_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescribed_exercises" ADD CONSTRAINT "prescribed_exercises_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescribed_exercises" ADD CONSTRAINT "prescribed_exercises_template_exercise_id_template_exercises_id_fk" FOREIGN KEY ("template_exercise_id") REFERENCES "public"."template_exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescribed_sets" ADD CONSTRAINT "prescribed_sets_prescribed_exercise_id_prescribed_exercises_id_fk" FOREIGN KEY ("prescribed_exercise_id") REFERENCES "public"."prescribed_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_exercise_muscles" ADD CONSTRAINT "template_exercise_muscles_template_exercise_id_template_exercises_id_fk" FOREIGN KEY ("template_exercise_id") REFERENCES "public"."template_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_exercises" ADD CONSTRAINT "template_exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_exercises" ADD CONSTRAINT "template_exercises_variant_of_template_exercises_id_fk" FOREIGN KEY ("variant_of") REFERENCES "public"."template_exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;