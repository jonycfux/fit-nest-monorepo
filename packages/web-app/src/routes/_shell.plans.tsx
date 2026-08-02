import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTRPC } from "../integrations/trpc";
import { useActiveWorkoutDraft } from "../lib/active-workout-draft";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ButtonLink } from "../ui/ButtonLink";
import { PanelWindow } from "../ui/PanelWindow";
import { Select } from "../ui/Select";

export const Route = createFileRoute("/_shell/plans")({
  component: DashboardPage,
});

type Period = "weekly" | "monthly";

function volumeBarColor(sets: number, target: number): string {
  const ratio = sets / target;
  if (ratio >= 0.9) return "bg-accent-success";
  if (ratio >= 0.6) return "bg-state-warning";
  return "bg-state-danger";
}

function DashboardPage() {
  const trpc = useTRPC();
  const [period, setPeriod] = useState<Period>("weekly");
  const volumeQuery = useQuery(trpc.dashboard.volumeByMuscleGroup.queryOptions({ period }));
  const plansQuery = useQuery(trpc.plans.list.queryOptions());
  const { draft } = useActiveWorkoutDraft();

  const maxSets = Math.max(1, ...(volumeQuery.data?.map((row) => row.sets) ?? [1]));

  return (
    <div className="max-w-[640px] p-8">
      <div className="mb-6">
        <div className="text-caption text-muted uppercase tracking-wide">Welcome back</div>
        <h1>Dashboard</h1>
      </div>

      <div className="mb-5 max-w-[420px] rounded-lg border border-default bg-surface-card p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-micro text-muted uppercase tracking-wide">
            Set volume by muscle group
          </span>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            options={[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]}
            className="w-[110px] py-1 text-caption"
          />
        </div>
        <div className="flex flex-col gap-2">
          {volumeQuery.data?.map((row) => (
            <div key={row.muscleGroup} className="flex items-center gap-2.5">
              <div className="w-[90px] shrink-0 text-body-sm text-secondary capitalize">
                {row.muscleGroup}
              </div>
              <div className="h-[7px] flex-1 rounded-full bg-surface-canvas">
                <div
                  className={`h-full rounded-full ${volumeBarColor(row.sets, row.target)}`}
                  style={{ width: `${(row.sets / maxSets) * 100}%` }}
                />
              </div>
              <div className="w-6 shrink-0 text-right text-body-sm text-secondary tabular-nums">
                {row.sets}
              </div>
            </div>
          ))}
        </div>
      </div>

      {draft ? (
        <div className="mb-5">
          <PanelWindow title="Continue" meta="today">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-body text-heading">{draft.workoutName}</div>
                <div className="text-caption text-muted">
                  {draft.exercises.length} exercises · ~{draft.exercises.length * 10} min
                </div>
              </div>
              <ButtonLink to="/active" variant="primary">
                Start
              </ButtonLink>
            </div>
          </PanelWindow>
        </div>
      ) : null}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-h3">Your plans</h2>
        <Button variant="secondary" size="sm" disabled title="Not part of this build yet">
          New plan
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {plansQuery.data?.map((plan) => (
          <ButtonLink
            key={plan.id}
            to="/plans/$planId"
            params={{ planId: plan.id }}
            variant="secondary"
            className="!justify-between w-full px-4 py-3"
          >
            <span className="flex flex-col items-start gap-0.5">
              <span className="font-semibold text-body-sm text-heading">{plan.name}</span>
              <span className="text-caption text-muted">
                {plan.durationWeeks} weeks · {plan.workoutCount} workouts
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Badge tone="primary">active</Badge>
              <ChevronRight size={16} className="text-muted" />
            </span>
          </ButtonLink>
        ))}
      </div>
    </div>
  );
}
