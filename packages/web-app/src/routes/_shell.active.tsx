import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTRPC } from "../integrations/trpc";
import { totalSetsLogged, useActiveWorkoutDraft } from "../lib/active-workout-draft";
import { Button } from "../ui/Button";
import { ButtonLink } from "../ui/ButtonLink";
import { Checkbox } from "../ui/Checkbox";
import { PanelWindow } from "../ui/PanelWindow";

export const Route = createFileRoute("/_shell/active")({
  component: ActiveWorkoutPage,
});

function ActiveWorkoutPage() {
  const { draft, setDraft } = useActiveWorkoutDraft();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const finishMutation = useMutation(
    trpc.loggedWorkouts.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.loggedWorkouts.pathKey() });
        setDraft(null);
        navigate({ to: "/plans" });
      },
    }),
  );

  if (draft === null) {
    return (
      <div className="p-8">
        <h1>Active Workout</h1>
        <p className="mt-2 text-body-sm text-muted">
          No workout in progress. Start one from Plan Builder or the Dashboard's "Continue" panel.
        </p>
        <ButtonLink to="/plans" variant="primary" className="mt-4">
          Go to Dashboard
        </ButtonLink>
      </div>
    );
  }

  const { done, total } = totalSetsLogged(draft);

  function updateActual(
    exerciseIndex: number,
    setIndex: number,
    field: "actualReps" | "actualLoad",
    value: number | null,
  ) {
    if (!draft) return;
    const exercises = draft.exercises.map((exercise, ei) =>
      ei !== exerciseIndex
        ? exercise
        : {
            ...exercise,
            sets: exercise.sets.map((set, si) =>
              si !== setIndex ? set : { ...set, [field]: value },
            ),
          },
    );
    setDraft({ ...draft, exercises });
  }

  function toggleDone(exerciseIndex: number, setIndex: number) {
    if (!draft) return;
    const exercises = draft.exercises.map((exercise, ei) =>
      ei !== exerciseIndex
        ? exercise
        : {
            ...exercise,
            sets: exercise.sets.map((set, si) =>
              si !== setIndex ? set : { ...set, done: !set.done },
            ),
          },
    );
    setDraft({ ...draft, exercises });
  }

  function handleFinish() {
    if (!draft) return;
    const exercises = draft.exercises
      .map((exercise) => ({
        templateExerciseId: exercise.templateExerciseId,
        sets: exercise.sets
          .filter((set) => set.done)
          .map((set) => ({ actualReps: set.actualReps, actualLoad: set.actualLoad })),
      }))
      .filter((exercise) => exercise.sets.length > 0);

    finishMutation.mutate({ workoutId: draft.workoutId, exercises });
  }

  return (
    <div className="max-w-[640px] p-8">
      <h1>Logging — {draft.workoutName}</h1>
      <p className="mt-1 mb-4 text-body-sm text-muted">Records only what you actually do.</p>

      <div className="mb-1 h-1 w-full rounded-full bg-surface-canvas">
        <div
          className="h-full rounded-full bg-accent-success"
          style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
        />
      </div>
      <div className="mb-6 text-caption text-muted tabular-nums">
        {done}/{total}
      </div>

      <div className="flex flex-col gap-4">
        {draft.exercises.map((exercise, exerciseIndex) => {
          const exerciseDone = exercise.sets.filter((s) => s.done).length;
          return (
            <PanelWindow key={exercise.templateExerciseId} title={exercise.name}>
              <table>
                <thead>
                  <tr>
                    <th className="w-8">#</th>
                    <th>Target</th>
                    <th>Actual</th>
                    <th className="w-10 text-right">Done</th>
                  </tr>
                </thead>
                <tbody>
                  {exercise.sets.map((set, setIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: sets have no stable id in this draft model
                    <tr key={setIndex}>
                      <td className="py-1.5 text-body-sm text-muted tabular-nums">
                        {setIndex + 1}
                      </td>
                      <td className="py-1.5 text-body-sm text-secondary tabular-nums">
                        {set.targetReps ?? "—"}
                        {set.targetLoad ? ` @ ${set.targetLoad}kg` : ""}
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            className="w-14 rounded border border-default bg-surface-canvas px-1.5 py-0.5 text-body-sm text-primary tabular-nums"
                            value={set.actualReps ?? ""}
                            onChange={(e) =>
                              updateActual(
                                exerciseIndex,
                                setIndex,
                                "actualReps",
                                e.target.value === "" ? null : Number(e.target.value),
                              )
                            }
                          />
                          <span className="text-caption text-muted">reps</span>
                        </div>
                      </td>
                      <td className="py-1.5 text-right">
                        <Checkbox
                          checked={set.done}
                          onChange={() => toggleDone(exerciseIndex, setIndex)}
                          label={`Mark ${exercise.name} set ${setIndex + 1} done`}
                          hideLabel
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 rounded-md border border-state-info bg-surface-canvas px-3 py-2 text-body-sm text-primary">
                <span className="mr-2 font-semibold text-state-info text-micro uppercase tracking-wide">
                  Info
                </span>
                {exerciseDone}/{exercise.sets.length} sets logged
              </div>
            </PanelWindow>
          );
        })}
      </div>

      <Button
        variant="primary"
        className="mt-6"
        onClick={handleFinish}
        disabled={done === 0 || finishMutation.isPending}
      >
        Finish workout
      </Button>
    </div>
  );
}
