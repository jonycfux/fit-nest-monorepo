import { healthRouter } from "./routers/health.js";
import { loggedWorkoutsRouter } from "./routers/logged-workouts.js";
import { plansRouter } from "./routers/plans.js";
import { templateExercisesRouter } from "./routers/template-exercises.js";
import { workoutsRouter } from "./routers/workouts.js";
import { router } from "./trpc.js";

export const appRouter = router({
  health: healthRouter,
  templateExercises: templateExercisesRouter,
  workouts: workoutsRouter,
  plans: plansRouter,
  loggedWorkouts: loggedWorkoutsRouter,
});

export type AppRouter = typeof appRouter;
