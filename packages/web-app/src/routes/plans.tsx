import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTRPC } from "../integrations/trpc";

export const Route = createFileRoute("/plans")({
  component: PlansPage,
});

function PlansPage() {
  const trpc = useTRPC();
  // Fully typed from @fitnest/api — no URLs, no hand-written response types.
  const plansQuery = useQuery(trpc.plans.list.queryOptions());

  if (plansQuery.isPending) {
    return <div className="p-4">Loading plans…</div>;
  }

  if (plansQuery.error) {
    return <div className="p-4">Error: {plansQuery.error.message}</div>;
  }

  return (
    <ul className="p-4">
      {plansQuery.data.map((plan) => (
        <li key={plan.id}>
          {plan.name} — {plan.durationWeeks} weeks
        </li>
      ))}
    </ul>
  );
}
