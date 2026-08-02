import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Pencil, Plus, Search, ShoppingCart, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTRPC } from "../integrations/trpc";
import { useActiveWorkoutDraft } from "../lib/active-workout-draft";
import { type CartItem, useCartDraft } from "../lib/cart-draft";
import { confirmReplaceDraft } from "../lib/draft";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { Chip } from "../ui/Chip";
import { IconButton } from "../ui/IconButton";
import { IconButtonLink } from "../ui/IconButtonLink";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Stepper } from "../ui/Stepper";

export const Route = createFileRoute("/_shell/plans_/$planId")({
  component: PlanBuilderPage,
});

const PATTERNS = ["all", "push", "pull", "squat", "hinge", "lunge", "core"] as const;
const NEW_WORKOUT = "__new__";

function PlanBuilderPage() {
  const { planId } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const planQuery = useQuery(trpc.plans.byId.queryOptions({ id: planId }));
  const exercisesQuery = useQuery(trpc.templateExercises.list.queryOptions());
  const { draft: cart, setDraft: setCart } = useCartDraft(planId);
  const { draft: activeDraft, setDraft: setActiveDraft } = useActiveWorkoutDraft();

  const [search, setSearch] = useState("");
  const [pattern, setPattern] = useState<(typeof PATTERNS)[number]>("all");
  const [startAfterSave, setStartAfterSave] = useState(false);

  // Default to a fresh "New workout" draft on first visit to this plan.
  useEffect(() => {
    if (cart === null) {
      setCart({ planId, workoutId: null, workoutName: "", items: [] });
    }
  }, [cart, planId, setCart]);

  const saveMutation = useMutation(
    trpc.workouts.setExercises.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.workouts.pathKey() });
        await queryClient.invalidateQueries({ queryKey: trpc.plans.pathKey() });
      },
    }),
  );
  const createWorkoutMutation = useMutation(trpc.workouts.create.mutationOptions());
  const setPlanWorkoutsMutation = useMutation(trpc.plans.setWorkouts.mutationOptions());

  async function selectWorkout(value: string) {
    if (value === NEW_WORKOUT) {
      setCart({ planId, workoutId: null, workoutName: "", items: [] });
      return;
    }
    const workout = await queryClient.fetchQuery(trpc.workouts.byId.queryOptions({ id: value }));
    const items: CartItem[] = workout.exercises.map((exercise) => ({
      templateExerciseId: exercise.templateExerciseId,
      name:
        exercisesQuery.data?.find((e) => e.id === exercise.templateExerciseId)?.name ?? "Exercise",
      sets: exercise.sets.length || 1,
      reps: exercise.sets[0]?.targetReps ?? 8,
    }));
    setCart({ planId, workoutId: workout.id, workoutName: workout.name, items });
  }

  function toggleAdd(exerciseId: string, name: string) {
    if (!cart) return;
    const exists = cart.items.some((i) => i.templateExerciseId === exerciseId);
    if (exists) {
      setCart({ ...cart, items: cart.items.filter((i) => i.templateExerciseId !== exerciseId) });
    } else {
      setCart({
        ...cart,
        items: [...cart.items, { templateExerciseId: exerciseId, name, sets: 3, reps: 8 }],
      });
    }
  }

  function removeItem(exerciseId: string) {
    if (!cart) return;
    setCart({ ...cart, items: cart.items.filter((i) => i.templateExerciseId !== exerciseId) });
  }

  function bumpSets(exerciseId: string, delta: number) {
    if (!cart) return;
    setCart({
      ...cart,
      items: cart.items.map((i) =>
        i.templateExerciseId === exerciseId ? { ...i, sets: Math.max(1, i.sets + delta) } : i,
      ),
    });
  }

  async function handleSave() {
    if (!cart) return;

    if (startAfterSave && activeDraft) {
      if (!confirmReplaceDraft(activeDraft.workoutName)) return;
    }

    const exercisesInput = cart.items.map((item) => ({
      templateExerciseId: item.templateExerciseId,
      sets: Array.from({ length: item.sets }, () => ({ targetReps: item.reps })),
    }));

    let workoutId = cart.workoutId;
    if (!workoutId) {
      const created = await createWorkoutMutation.mutateAsync({ name: cart.workoutName });
      workoutId = created.id;
      const existingIds = planQuery.data?.workouts.map((w) => w.id) ?? [];
      await setPlanWorkoutsMutation.mutateAsync({
        planId,
        workoutIds: [...existingIds, workoutId],
      });
    }

    await saveMutation.mutateAsync({ workoutId, exercises: exercisesInput });

    if (startAfterSave) {
      setActiveDraft({
        workoutId,
        workoutName: cart.workoutName,
        startedAt: new Date().toISOString(),
        exercises: cart.items.map((item) => ({
          templateExerciseId: item.templateExerciseId,
          name: item.name,
          sets: Array.from({ length: item.sets }, () => ({
            targetReps: item.reps,
            targetLoad: null,
            actualReps: null,
            actualLoad: null,
            done: false,
          })),
        })),
      });
      setCart(null);
      navigate({ to: "/active" });
      return;
    }

    setCart(null);
    navigate({ to: "/plans" });
  }

  const filteredExercises = useMemo(() => {
    if (!exercisesQuery.data) return [];
    return exercisesQuery.data.filter((exercise) => {
      const matchesPattern = pattern === "all" || exercise.movementPattern === pattern;
      const matchesSearch = exercise.name.toLowerCase().includes(search.toLowerCase());
      return matchesPattern && matchesSearch;
    });
  }, [exercisesQuery.data, pattern, search]);

  if (planQuery.isPending || exercisesQuery.isPending || !cart) {
    return <div className="p-8 text-muted">Loading plan builder…</div>;
  }
  if (planQuery.error) {
    return <div className="p-8 text-state-danger">Error: {planQuery.error.message}</div>;
  }

  const plan = planQuery.data;

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto border-default border-r p-6">
        <h2>Exercise library</h2>
        <div className="mt-1 font-condensed text-accent-primary-text text-caption uppercase tracking-wide">
          Active plan: {plan.name}
        </div>
        <p className="mt-1 mb-4 text-body-sm text-muted">
          Tap an exercise to add it to the workout cart
        </p>

        <Input
          icon={Search}
          placeholder="Search exercises"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />

        <div className="mb-4 flex flex-wrap gap-2">
          {PATTERNS.map((p) => (
            <Chip key={p} active={pattern === p} onClick={() => setPattern(p)}>
              {p}
            </Chip>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {filteredExercises.map((exercise) => {
            const added = cart.items.some((i) => i.templateExerciseId === exercise.id);
            return (
              <div
                key={exercise.id}
                className="flex items-center justify-between rounded-md border border-default bg-surface-card px-3.5 py-2.5"
              >
                <div>
                  <div className="font-semibold text-body-sm text-heading">{exercise.name}</div>
                  <div className="mt-1 flex gap-1.5">
                    <Badge tone="info">{exercise.movementPattern}</Badge>
                    {exercise.equipment ? <Badge tone="neutral">{exercise.equipment}</Badge> : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <IconButtonLink
                    to="/library/$exerciseId/edit"
                    params={{ exerciseId: exercise.id }}
                    icon={Pencil}
                    label={`Edit ${exercise.name}`}
                  />
                  <IconButton
                    icon={added ? Check : Plus}
                    variant={added ? "primary" : "secondary"}
                    label={
                      added ? `Remove ${exercise.name} from cart` : `Add ${exercise.name} to cart`
                    }
                    onClick={() => toggleAdd(exercise.id, exercise.name)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-[320px] shrink-0 overflow-auto p-6">
        <div className="mb-1 flex items-center gap-2">
          <ShoppingCart size={18} strokeWidth={1.75} className="text-heading" />
          <h2 className="text-h3">Workout cart</h2>
        </div>

        <div className="mt-3 mb-1 text-caption text-muted uppercase tracking-wide">Workout</div>
        <Select
          value={cart.workoutId ?? NEW_WORKOUT}
          onChange={(e) => selectWorkout(e.target.value)}
          options={[
            { value: NEW_WORKOUT, label: "+ New workout" },
            ...plan.workouts.map((w) => ({ value: w.id, label: w.name })),
          ]}
          className="mb-3"
        />

        {cart.workoutId === null ? (
          <Input
            placeholder="Workout name"
            value={cart.workoutName}
            onChange={(e) => setCart({ ...cart, workoutName: e.target.value })}
            className="mb-4"
          />
        ) : (
          <p className="mb-4 text-body-sm text-muted">
            {cart.workoutName} · {cart.items.length} exercises
          </p>
        )}

        <div className="flex flex-col gap-2">
          {cart.items.map((item) => (
            <div
              key={item.templateExerciseId}
              className="flex items-center justify-between rounded-md border border-default bg-surface-raised px-3 py-2.5"
            >
              <div>
                <div className="font-semibold text-body-sm text-heading">{item.name}</div>
                <div className="text-caption text-muted tabular-nums">
                  {item.sets} × {item.reps}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Stepper
                  onDecrement={() => bumpSets(item.templateExerciseId, -1)}
                  onIncrement={() => bumpSets(item.templateExerciseId, 1)}
                />
                <IconButton
                  icon={X}
                  size="sm"
                  label={`Remove ${item.name}`}
                  onClick={() => removeItem(item.templateExerciseId)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Checkbox
            checked={startAfterSave}
            onChange={setStartAfterSave}
            label="Immediately start an active workout after save"
          />
          <Button
            variant="primary"
            className="w-full"
            disabled={
              cart.items.length === 0 || (cart.workoutId === null && cart.workoutName.trim() === "")
            }
            onClick={handleSave}
          >
            Save workout
          </Button>
        </div>
      </div>
    </div>
  );
}
