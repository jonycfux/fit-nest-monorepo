import { useDraft } from "./draft";

export type CartItem = {
  templateExerciseId: string;
  name: string;
  sets: number;
  reps: number;
};

export type CartDraft = {
  planId: string;
  // null while building a brand-new Workout not yet saved (plan decision #12).
  workoutId: string | null;
  workoutName: string;
  items: CartItem[];
};

const cartDraftKey = (planId: string) => `fitnest:planBuilderCart:${planId}`;

// Survives the Exercise Edit round-trip navigation (a real route change) and
// page refresh, same storage-backed pattern as the active-workout draft
// (plan decision #16, ADR 0006).
export function useCartDraft(planId: string) {
  return useDraft<CartDraft>(cartDraftKey(planId));
}
