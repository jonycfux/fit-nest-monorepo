import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Dumbbell, Flame, LayoutDashboard, LogOut, ShoppingCart } from "lucide-react";
import { useTRPC } from "../integrations/trpc";

function NavLink({
  to,
  icon: Icon,
  label,
  active,
  disabled,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  disabled?: boolean;
}) {
  const classes = `flex items-center gap-2.5 rounded-md px-3 py-2 font-condensed text-body-sm uppercase tracking-wide transition-colors duration-fast ${
    active
      ? "bg-surface-raised text-accent-secondary"
      : disabled
        ? "cursor-not-allowed text-disabled"
        : "text-muted hover:text-primary"
  }`;

  if (disabled) {
    return (
      <span className={classes}>
        <Icon size={16} strokeWidth={1.75} />
        {label}
      </span>
    );
  }

  return (
    <Link to={to} className={classes}>
      <Icon size={16} strokeWidth={1.75} />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const trpc = useTRPC();
  // Same query key Dashboard uses — React Query dedupes after first load.
  const plansQuery = useQuery(trpc.plans.list.queryOptions());
  const mostRecentPlan = plansQuery.data?.[0];

  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col justify-between border-r border-default bg-surface-app px-3 py-6">
      <div>
        <div className="mb-8 px-3 font-condensed font-bold text-h4 uppercase tracking-wide">
          <span className="text-heading">Fit</span>
          <span className="text-accent-secondary">Nest</span>
        </div>
        <nav className="flex flex-col gap-1">
          <NavLink
            to="/plans"
            icon={LayoutDashboard}
            label="Plans"
            active={pathname === "/plans"}
          />
          {mostRecentPlan ? (
            <NavLink
              to={`/plans/${mostRecentPlan.id}`}
              icon={ShoppingCart}
              label="Plan Builder"
              active={pathname.startsWith("/plans/")}
            />
          ) : (
            <NavLink to="#" icon={ShoppingCart} label="Plan Builder" active={false} disabled />
          )}
          <NavLink
            to="/active"
            icon={Flame}
            label="Active Workout"
            active={pathname.startsWith("/active")}
          />
          <NavLink
            to="/library"
            icon={Dumbbell}
            label="Exercise Library"
            active={pathname.startsWith("/library")}
          />
        </nav>
      </div>
      <NavLink to="#" icon={LogOut} label="Log out" active={false} disabled />
    </div>
  );
}
