import { useDraft } from "./draft";

export type ActiveWorkoutDraftSet = {
  targetReps: number | null;
  targetLoad: number | null;
  actualReps: number | null;
  actualLoad: number | null;
  done: boolean;
};

export type ActiveWorkoutDraftExercise = {
  templateExerciseId: string;
  name: string;
  sets: ActiveWorkoutDraftSet[];
};

export type ActiveWorkoutDraft = {
  workoutId: string;
  workoutName: string;
  exercises: ActiveWorkoutDraftExercise[];
  startedAt: string;
};

const ACTIVE_WORKOUT_DRAFT_KEY = "fitnest:activeWorkoutDraft";

// ADR 0006: Active Workout progress is a client-local draft, not a server
// session — this is the single mechanism the Dashboard's "Continue" panel and
// the Active Workout screen both read/write.
export function useActiveWorkoutDraft() {
  return useDraft<ActiveWorkoutDraft>(ACTIVE_WORKOUT_DRAFT_KEY);
}

export function totalSetsLogged(draft: ActiveWorkoutDraft): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const exercise of draft.exercises) {
    for (const set of exercise.sets) {
      total += 1;
      if (set.done) done += 1;
    }
  }
  return { done, total };
}
