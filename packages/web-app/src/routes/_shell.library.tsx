import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTRPC } from "../integrations/trpc";
import { Badge } from "../ui/Badge";

export const Route = createFileRoute("/_shell/library")({
  component: LibraryPage,
});

function LibraryPage() {
  const trpc = useTRPC();
  const exercisesQuery = useQuery(trpc.templateExercises.list.queryOptions());

  if (exercisesQuery.isPending) {
    return <div className="p-8 text-muted">Loading exercises…</div>;
  }
  if (exercisesQuery.error) {
    return <div className="p-8 text-state-danger">Error: {exercisesQuery.error.message}</div>;
  }

  const exercises = exercisesQuery.data;
  const nameById = new Map(exercises.map((e) => [e.id, e.name]));

  return (
    <div className="max-w-[960px] p-8">
      <h1>Exercise Library</h1>
      <p className="mb-6 text-body-sm text-muted">
        Your personal library — tap an exercise for details
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {exercises.map((exercise) => (
          <Link
            key={exercise.id}
            to="/library/$exerciseId"
            params={{ exerciseId: exercise.id }}
            className="block rounded-md border border-default bg-surface-card p-4 text-left no-underline transition-[filter] duration-fast ease-standard hover:brightness-110"
          >
            <div className="mb-1 font-semibold text-body text-heading">{exercise.name}</div>
            {exercise.variantOf ? (
              <div className="mb-2 text-caption text-muted">
                variant of {nameById.get(exercise.variantOf) ?? "unknown"}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="info">{exercise.movementPattern}</Badge>
              {exercise.primaryMuscles.map((m) => (
                <Badge key={m} tone="neutral">
                  {m}
                </Badge>
              ))}
              {exercise.equipment ? <Badge tone="neutral">{exercise.equipment}</Badge> : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
