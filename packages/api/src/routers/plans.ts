import { eq } from "drizzle-orm";
import { z } from "zod";
import { fitnessPlans, insertFitnessPlanSchema } from "../db/schema.js";
import { publicProcedure, router } from "../trpc.js";

// Reuse the drizzle-zod insert schema as the tRPC input — DB and API validation
// stay in lockstep from one definition.
const createPlanInput = insertFitnessPlanSchema.pick({
  name: true,
  durationWeeks: true,
});

export const plansRouter = router({
  list: publicProcedure.query(({ ctx }) => ctx.db.select().from(fitnessPlans)),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.select().from(fitnessPlans).where(eq(fitnessPlans.id, input.id)),
    ),

  create: publicProcedure
    .input(createPlanInput)
    .mutation(({ ctx, input }) =>
      ctx.db.insert(fitnessPlans).values(input).returning(),
    ),
});
