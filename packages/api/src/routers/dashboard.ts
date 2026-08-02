import { and, eq, gte, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  loggedExercises,
  loggedSets,
  loggedWorkouts,
  templateExerciseMuscles,
  templateExercises,
} from "../db/schema.js";
import { protectedProcedure, router } from "../trpc.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Weekly: 12 sets/muscle/week. Monthly: 48 sets/muscle/month (README: "Design
// Tokens" section's stated targets). Rolling windows, not calendar week/month.
const PERIODS = {
  weekly: { days: 7, target: 12 },
  monthly: { days: 30, target: 48 },
} as const;

export const dashboardRouter = router({
  // One row per muscle group the user actually trains (primary or secondary,
  // across active Template Exercises) — not every global muscle group, since a
  // row for a muscle nobody programs is noise, not signal. A set counts toward
  // every muscle group tagged on its exercise (CONTEXT.md draws no primary/
  // secondary volume-weighting distinction).
  volumeByMuscleGroup: protectedProcedure
    .input(z.object({ period: z.enum(["weekly", "monthly"]) }))
    .query(async ({ ctx, input }) => {
      const { days, target } = PERIODS[input.period];
      const since = new Date(Date.now() - days * DAY_MS);

      const trainedMuscles = await ctx.db
        .selectDistinct({ muscleGroup: templateExerciseMuscles.muscleGroup })
        .from(templateExerciseMuscles)
        .innerJoin(
          templateExercises,
          eq(templateExerciseMuscles.templateExerciseId, templateExercises.id),
        )
        .where(
          and(eq(templateExercises.userId, ctx.user.id), isNull(templateExercises.archivedAt)),
        );

      const loggedRows = await ctx.db
        .select({ muscleGroup: templateExerciseMuscles.muscleGroup })
        .from(loggedSets)
        .innerJoin(loggedExercises, eq(loggedSets.loggedExerciseId, loggedExercises.id))
        .innerJoin(loggedWorkouts, eq(loggedExercises.loggedWorkoutId, loggedWorkouts.id))
        .innerJoin(
          templateExerciseMuscles,
          eq(templateExerciseMuscles.templateExerciseId, loggedExercises.templateExerciseId),
        )
        .where(and(eq(loggedWorkouts.userId, ctx.user.id), gte(loggedWorkouts.performedAt, since)));

      const counts = new Map<string, number>();
      for (const row of loggedRows) {
        counts.set(row.muscleGroup, (counts.get(row.muscleGroup) ?? 0) + 1);
      }

      return trainedMuscles
        .map((m) => ({
          muscleGroup: m.muscleGroup,
          sets: counts.get(m.muscleGroup) ?? 0,
          target,
        }))
        .sort((a, b) => a.muscleGroup.localeCompare(b.muscleGroup));
    }),
});
