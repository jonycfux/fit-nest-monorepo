import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { prescribedExercises, prescribedSets, workouts } from "../db/schema.js";
import { protectedProcedure, router } from "../trpc.js";
import { assertOwnedExercises, firstOrThrow } from "./_shared.js";

const idInput = z.object({ id: z.string().uuid() });

// One Prescribed Set target (per-set, not scalar sets×reps — ADR 0001).
const setInput = z.object({
  targetReps: z.number().int().positive().nullish(), // null = AMRAP
  targetLoad: z.number().nonnegative().nullish(),
  targetRpe: z.number().min(1).max(10).nullish(),
});

// One Prescribed Exercise: a Template Exercise + ordered per-set targets.
const exerciseInput = z.object({
  templateExerciseId: z.string().uuid(),
  note: z.string().nullish(),
  sets: z.array(setInput),
});

export const workoutsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.select().from(workouts).where(eq(workouts.userId, ctx.user.id)).orderBy(workouts.name),
  ),

  // The workout with its ordered Prescribed Exercises, each with its sets.
  byId: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
    const [workout] = await ctx.db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, input.id), eq(workouts.userId, ctx.user.id)));
    if (!workout) throw new TRPCError({ code: "NOT_FOUND" });

    const exercises = await ctx.db
      .select()
      .from(prescribedExercises)
      .where(eq(prescribedExercises.workoutId, workout.id))
      .orderBy(prescribedExercises.position);

    const sets = await ctx.db
      .select()
      .from(prescribedSets)
      .innerJoin(
        prescribedExercises,
        eq(prescribedSets.prescribedExerciseId, prescribedExercises.id),
      )
      .where(eq(prescribedExercises.workoutId, workout.id))
      .orderBy(prescribedSets.position);

    return {
      ...workout,
      exercises: exercises.map((exercise) => ({
        ...exercise,
        sets: sets
          .filter((s) => s.prescribed_sets.prescribedExerciseId === exercise.id)
          .map((s) => s.prescribed_sets),
      })),
    };
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) =>
      firstOrThrow(
        await ctx.db
          .insert(workouts)
          .values({ ...input, userId: ctx.user.id })
          .returning(),
      ),
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      const [workout] = await ctx.db
        .update(workouts)
        .set(fields)
        .where(and(eq(workouts.id, id), eq(workouts.userId, ctx.user.id)))
        .returning();
      if (!workout) throw new TRPCError({ code: "NOT_FOUND" });
      return workout;
    }),

  // Hard delete — cascades to Prescribed Exercises/Sets. (Workouts have no
  // Archive concept; only Template Exercises do — ADR 0001.)
  delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const [workout] = await ctx.db
      .delete(workouts)
      .where(and(eq(workouts.id, input.id), eq(workouts.userId, ctx.user.id)))
      .returning();
    if (!workout) throw new TRPCError({ code: "NOT_FOUND" });
    return workout;
  }),

  // Replace the whole prescription (exercises + their sets) in one shot.
  setExercises: protectedProcedure
    .input(
      z.object({
        workoutId: z.string().uuid(),
        exercises: z.array(exerciseInput),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        const [workout] = await tx
          .select({ id: workouts.id })
          .from(workouts)
          .where(and(eq(workouts.id, input.workoutId), eq(workouts.userId, ctx.user.id)));
        if (!workout) throw new TRPCError({ code: "NOT_FOUND" });
        await assertOwnedExercises(
          tx,
          ctx.user.id,
          input.exercises.map((e) => e.templateExerciseId),
        );

        // Replace: clear existing entries (sets cascade), then re-insert.
        await tx
          .delete(prescribedExercises)
          .where(eq(prescribedExercises.workoutId, input.workoutId));

        for (const [position, exercise] of input.exercises.entries()) {
          const entry = firstOrThrow(
            await tx
              .insert(prescribedExercises)
              .values({
                workoutId: input.workoutId,
                templateExerciseId: exercise.templateExerciseId,
                position,
                note: exercise.note ?? null,
              })
              .returning(),
          );
          if (exercise.sets.length > 0) {
            await tx.insert(prescribedSets).values(
              exercise.sets.map((set, setPosition) => ({
                ...set,
                prescribedExerciseId: entry.id,
                position: setPosition,
              })),
            );
          }
        }
      }),
    ),
});
