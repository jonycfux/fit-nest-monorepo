import { healthRouter } from "./routers/health.js";
import { plansRouter } from "./routers/plans.js";
import { router } from "./trpc.js";

export const appRouter = router({
  health: healthRouter,
  plans: plansRouter,
});

export type AppRouter = typeof appRouter;
