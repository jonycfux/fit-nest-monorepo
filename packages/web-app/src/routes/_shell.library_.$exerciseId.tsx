import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Repeat } from "lucide-react";
import { useTRPC } from "../integrations/trpc";
import { Badge } from "../ui/Badge";
import { ButtonLink } from "../ui/ButtonLink";
import { IconButtonLink } from "../ui/IconButtonLink";
import { PanelWindow } from "../ui/PanelWindow";

export const Route = createFileRoute("/_shell/library_/$exerciseId")({
  component: ExerciseDetailPage,
});

function ExerciseDetailPage() {
  const { exerciseId } = Route.useParams();
  const trpc = useTRPC();
  const exerciseQuery = useQuery(trpc.templateExercises.byId.queryOptions({ id: exerciseId }));
  // Resolves backup/variant-source ids to names — cheap, and React Query dedupes
  // if the Library grid already populated this same query.
  const listQuery = useQuery(trpc.templateExercises.list.queryOptions());

  if (exerciseQuery.isPending || listQuery.isPending) {
    return <div className="p-8 text-muted">Loading exercise…</div>;
  }
  if (exerciseQuery.error) {
    return <div className="p-8 text-state-danger">Error: {exerciseQuery.error.message}</div>;
  }

  const exercise = exerciseQuery.data;
  const nameById = new Map((listQuery.data ?? []).map((e) => [e.id, e.name]));
  const primaryMuscles = exercise.muscles.filter((m) => m.role === "primary");
  const secondaryMuscles = exercise.muscles.filter((m) => m.role === "secondary");

  return (
    <div className="max-w-[640px] p-8">
      <div className="mb-6 flex items-center gap-4">
        <IconButtonLink to="/library" icon={ArrowLeft} label="Back to library" />
        <div>
          <h1>{exercise.name}</h1>
          {exercise.variantOf ? (
            <div className="text-caption text-muted">
              variant of {nameById.get(exercise.variantOf) ?? "unknown"}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <PanelWindow title="Attributes">
          <div className="flex flex-col gap-4">
            <div className="flex gap-6">
              <div>
                <div className="mb-1.5 text-caption text-muted uppercase tracking-wide">
                  Movement pattern
                </div>
                <Badge tone="info">{exercise.movementPattern}</Badge>
              </div>
              {exercise.equipment ? (
                <div>
                  <div className="mb-1.5 text-caption text-muted uppercase tracking-wide">
                    Equipment
                  </div>
                  <Badge tone="neutral">{exercise.equipment}</Badge>
                </div>
              ) : null}
              {exercise.attachment ? (
                <div>
                  <div className="mb-1.5 text-caption text-muted uppercase tracking-wide">
                    Attachment
                  </div>
                  <Badge tone="neutral">{exercise.attachment}</Badge>
                </div>
              ) : null}
            </div>
            <div>
              <div className="mb-1.5 text-caption text-muted uppercase tracking-wide">
                Target muscles — primary
              </div>
              <div className="flex flex-wrap gap-1.5">
                {primaryMuscles.map((m) => (
                  <Badge key={m.muscleGroup} tone="neutral">
                    {m.muscleGroup}
                  </Badge>
                ))}
              </div>
            </div>
            {secondaryMuscles.length > 0 ? (
              <div>
                <div className="mb-1.5 text-caption text-muted uppercase tracking-wide">
                  Target muscles — secondary
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {secondaryMuscles.map((m) => (
                    <Badge key={m.muscleGroup} tone="neutral">
                      {m.muscleGroup}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </PanelWindow>

        {exercise.note ? (
          <PanelWindow title="Note">
            <p className="text-body-sm text-secondary leading-normal">{exercise.note}</p>
          </PanelWindow>
        ) : null}

        <PanelWindow title="Backup exercises" meta={`${exercise.backups.length} backups`}>
          {exercise.backups.length === 0 ? (
            <p className="text-body-sm text-muted">No backups set.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {exercise.backups.map((backup) => (
                <div
                  key={backup.backupExerciseId}
                  className="flex items-center gap-2 rounded-md border border-default bg-surface-canvas px-3 py-2"
                >
                  <Repeat size={14} strokeWidth={1.75} className="text-muted" />
                  <span className="text-body-sm text-primary">
                    {nameById.get(backup.backupExerciseId) ?? "unknown"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </PanelWindow>

        <div>
          <ButtonLink to="/library/$exerciseId/edit" params={{ exerciseId }} variant="secondary">
            Edit template
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
