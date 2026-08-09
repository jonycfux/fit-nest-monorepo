import type { AppRouter } from "@fitnest/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { inferRouterInputs } from "@trpc/server";
import { useState } from "react";
import { useTRPC } from "../integrations/trpc";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { PanelWindow } from "../ui/PanelWindow";
import { Select } from "../ui/Select";

export const Route = createFileRoute("/_shell/library_/$exerciseId_/edit")({
  component: ExerciseEditPage,
});

// Sourced from the router's input types, which the API derives from the Drizzle
// enums (`z.enum(movementPattern.enumValues)`), so these unions can't drift from
// the DB. The option lists below are checked for exhaustiveness at compile time.
type UpdateInput = inferRouterInputs<AppRouter>["templateExercises"]["update"];
type MovementPattern = NonNullable<UpdateInput["movementPattern"]>;
type Equipment = NonNullable<UpdateInput["equipment"]>;

const MOVEMENT_PATTERNS = [
  "push",
  "pull",
  "squat",
  "hinge",
  "lunge",
  "carry",
  "core",
] as const satisfies readonly MovementPattern[];

const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
  "kettlebell",
  "band",
  "foam-roller",
  "medicine-ball",
  "exercise-ball",
  "ez-bar",
] as const satisfies readonly Equipment[];

// Compile error if the DB enum gains a member that isn't offered in the dropdowns.
// Exported only so `noUnusedLocals` doesn't strip these guards.
type AssertNever<T extends never> = T;
export type AllPatternsOffered = AssertNever<
  Exclude<MovementPattern, (typeof MOVEMENT_PATTERNS)[number]>
>;
export type AllEquipmentOffered = AssertNever<Exclude<Equipment, (typeof EQUIPMENT)[number]>>;

function ExerciseEditPage() {
  const { exerciseId } = Route.useParams();
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const exerciseQuery = useQuery(trpc.templateExercises.byId.queryOptions({ id: exerciseId }));

  const [name, setName] = useState<string | null>(null);
  const [movementPattern, setMovementPattern] = useState<MovementPattern | null>(null);
  const [equipment, setEquipment] = useState<Equipment | "" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const updateMutation = useMutation(
    trpc.templateExercises.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.templateExercises.byId.queryKey({ id: exerciseId }),
        });
        await queryClient.invalidateQueries({ queryKey: trpc.templateExercises.list.queryKey() });
        router.history.back();
      },
    }),
  );

  if (exerciseQuery.isPending) {
    return <div className="p-8 text-muted">Loading exercise…</div>;
  }
  if (exerciseQuery.error) {
    return <div className="p-8 text-state-danger">Error: {exerciseQuery.error.message}</div>;
  }

  const exercise = exerciseQuery.data;
  const currentName = name ?? exercise.name;
  const currentPattern = movementPattern ?? exercise.movementPattern;
  const currentEquipment = equipment ?? exercise.equipment ?? "";
  const currentNote = note ?? exercise.note ?? "";

  function handleSave() {
    updateMutation.mutate({
      id: exerciseId,
      name: currentName,
      movementPattern: currentPattern,
      equipment: currentEquipment || null,
      note: currentNote || null,
    });
  }

  return (
    <div className="max-w-[560px] p-8">
      <h1 className="mb-6">Edit template</h1>

      <PanelWindow title="Details">
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1.5 text-caption text-muted uppercase tracking-wide">Name</div>
            <Input value={currentName} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <div className="mb-1.5 text-caption text-muted uppercase tracking-wide">
              Movement pattern
            </div>
            <Select
              value={currentPattern}
              onChange={(e) =>
                setMovementPattern(
                  MOVEMENT_PATTERNS.find((p) => p === e.target.value) ?? currentPattern,
                )
              }
              options={MOVEMENT_PATTERNS.map((p) => ({ value: p, label: p }))}
            />
          </div>
          <div>
            <div className="mb-1.5 text-caption text-muted uppercase tracking-wide">Equipment</div>
            <Select
              value={currentEquipment}
              onChange={(e) => setEquipment(EQUIPMENT.find((eq) => eq === e.target.value) ?? "")}
              options={[
                { value: "", label: "None" },
                ...EQUIPMENT.map((eq) => ({ value: eq, label: eq })),
              ]}
            />
          </div>
          <div>
            <div className="mb-1.5 text-caption text-muted uppercase tracking-wide">Note</div>
            <Textarea value={currentNote} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      </PanelWindow>

      <div className="mt-4 flex gap-3">
        <Button variant="primary" onClick={handleSave} disabled={updateMutation.isPending}>
          Save changes
        </Button>
        <Button variant="secondary" onClick={() => router.history.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
