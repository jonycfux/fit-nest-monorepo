import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { fitnessPlans, planWorkouts, workouts } from "../db/schema.js";
import { protectedProcedure, router } from "../trpc.js";
import { firstOrThrow } from "./_shared.js";

const idInput = z.object({ id: z.string().uuid() });

const planFields = z.object({
  name: z.string().min(1),
  durationWeeks: z.number().int().positive(),
});

export const plansRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(fitnessPlans)
      .where(eq(fitnessPlans.userId, ctx.user.id)),
  ),

  // The plan with its ordered Workouts (reference composition — ADR 0001).
  byId: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
    const [plan] = await ctx.db
      .select()
      .from(fitnessPlans)
      .where(
        and(eq(fitnessPlans.id, input.id), eq(fitnessPlans.userId, ctx.user.id)),
      );
    if (!plan) throw new TRPCError({ code: "NOT_FOUND" });

    const planWorkoutRows = await ctx.db
      .select({ workout: workouts, position: planWorkouts.position })
      .from(planWorkouts)
      .innerJoin(workouts, eq(planWorkouts.workoutId, workouts.id))
      .where(eq(planWorkouts.planId, plan.id))
      .orderBy(planWorkouts.position);

    return { ...plan, workouts: planWorkoutRows.map((r) => r.workout) };
  }),

  create: protectedProcedure.input(planFields).mutation(async ({ ctx, input }) =>
    firstOrThrow(
      await ctx.db
        .insert(fitnessPlans)
        .values({ ...input, userId: ctx.user.id })
        .returning(),
    ),
  ),

  update: protectedProcedure
    .input(planFields.partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      const [plan] = await ctx.db
        .update(fitnessPlans)
        .set(fields)
        .where(and(eq(fitnessPlans.id, id), eq(fitnessPlans.userId, ctx.user.id)))
        .returning();
      if (!plan) throw new TRPCError({ code: "NOT_FOUND" });
      return plan;
    }),

  delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const [plan] = await ctx.db
      .delete(fitnessPlans)
      .where(
        and(eq(fitnessPlans.id, input.id), eq(fitnessPlans.userId, ctx.user.id)),
      )
      .returning();
    if (!plan) throw new TRPCError({ code: "NOT_FOUND" });
    return plan;
  }),

  // Replace the plan's ordered Workout list (the plan_workouts join).
  setWorkouts: protectedProcedure
    .input(
      z.object({
        planId: z.string().uuid(),
        workoutIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        const [plan] = await tx
          .select({ id: fitnessPlans.id })
          .from(fitnessPlans)
          .where(
            and(
              eq(fitnessPlans.id, input.planId),
              eq(fitnessPlans.userId, ctx.user.id),
            ),
          );
        if (!plan) throw new TRPCError({ code: "NOT_FOUND" });

        // ADR 0002: the plan may only reference the user's own Workouts.
        const unique = [...new Set(input.workoutIds)];
        if (unique.length > 0) {
          const owned = await tx
            .select({ id: workouts.id })
            .from(workouts)
            .where(
              and(
                eq(workouts.userId, ctx.user.id),
                inArray(workouts.id, unique),
              ),
            );
          if (owned.length !== unique.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Unknown or unowned Workout.",
            });
          }
        }

        await tx
          .delete(planWorkouts)
          .where(eq(planWorkouts.planId, input.planId));
        if (input.workoutIds.length > 0) {
          await tx.insert(planWorkouts).values(
            input.workoutIds.map((workoutId, position) => ({
              planId: input.planId,
              workoutId,
              position,
            })),
          );
        }
      }),
    ),
});
