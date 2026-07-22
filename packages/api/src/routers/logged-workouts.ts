import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  loggedExercises,
  loggedSets,
  loggedWorkouts,
  workouts,
} from "../db/schema.js";
import { protectedProcedure, router } from "../trpc.js";
import { assertOwnedExercises, firstOrThrow } from "./_shared.js";

const idInput = z.object({ id: z.string().uuid() });

// One Logged Set: what actually happened (no RPE, no set-level note — ADR 0001).
const setInput = z.object({
  actualReps: z.number().int().nonnegative().nullish(),
  actualLoad: z.number().nonnegative().nullish(),
});

const exerciseInput = z.object({
  templateExerciseId: z.string().uuid(),
  note: z.string().nullish(),
  sets: z.array(setInput),
});

export const loggedWorkoutsRouter = router({
  // Most-recent-first training history.
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(loggedWorkouts)
      .where(eq(loggedWorkouts.userId, ctx.user.id))
      .orderBy(desc(loggedWorkouts.performedAt)),
  ),

  byId: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
    const [session] = await ctx.db
      .select()
      .from(loggedWorkouts)
      .where(
        and(
          eq(loggedWorkouts.id, input.id),
          eq(loggedWorkouts.userId, ctx.user.id),
        ),
      );
    if (!session) throw new TRPCError({ code: "NOT_FOUND" });

    const exercises = await ctx.db
      .select()
      .from(loggedExercises)
      .where(eq(loggedExercises.loggedWorkoutId, session.id))
      .orderBy(loggedExercises.position);

    const sets = await ctx.db
      .select()
      .from(loggedSets)
      .innerJoin(
        loggedExercises,
        eq(loggedSets.loggedExerciseId, loggedExercises.id),
      )
      .where(eq(loggedExercises.loggedWorkoutId, session.id))
      .orderBy(loggedSets.position);

    return {
      ...session,
      exercises: exercises.map((exercise) => ({
        ...exercise,
        sets: sets
          .filter((s) => s.logged_sets.loggedExerciseId === exercise.id)
          .map((s) => s.logged_sets),
      })),
    };
  }),

  // Log a performed session. `workoutId` is an optional origin only (never a
  // prescription snapshot — performed-only, ADR 0001); omit it for a freestyle
  // session. Everything recorded is what actually happened.
  create: protectedProcedure
    .input(
      z.object({
        workoutId: z.string().uuid().nullish(),
        performedAt: z.coerce.date().optional(),
        exercises: z.array(exerciseInput),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        if (input.workoutId) {
          const [origin] = await tx
            .select({ id: workouts.id })
            .from(workouts)
            .where(
              and(
                eq(workouts.id, input.workoutId),
                eq(workouts.userId, ctx.user.id),
              ),
            );
          if (!origin) throw new TRPCError({ code: "NOT_FOUND" });
        }
        await assertOwnedExercises(
          tx,
          ctx.user.id,
          input.exercises.map((e) => e.templateExerciseId),
        );

        const session = firstOrThrow(
          await tx
            .insert(loggedWorkouts)
            .values({
              userId: ctx.user.id,
              workoutId: input.workoutId ?? null,
              performedAt: input.performedAt ?? new Date(),
            })
            .returning(),
        );

        for (const [position, exercise] of input.exercises.entries()) {
          const logged = firstOrThrow(
            await tx
              .insert(loggedExercises)
              .values({
                loggedWorkoutId: session.id,
                templateExerciseId: exercise.templateExerciseId,
                position,
                note: exercise.note ?? null,
              })
              .returning(),
          );
          if (exercise.sets.length > 0) {
            await tx.insert(loggedSets).values(
              exercise.sets.map((set, setPosition) => ({
                ...set,
                loggedExerciseId: logged.id,
                position: setPosition,
              })),
            );
          }
        }

        return session;
      }),
    ),

  delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const [session] = await ctx.db
      .delete(loggedWorkouts)
      .where(
        and(
          eq(loggedWorkouts.id, input.id),
          eq(loggedWorkouts.userId, ctx.user.id),
        ),
      )
      .returning();
    if (!session) throw new TRPCError({ code: "NOT_FOUND" });
    return session;
  }),
});
