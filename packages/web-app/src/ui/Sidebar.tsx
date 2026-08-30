import { ClerkLoaded, ClerkLoading, useClerk } from "@clerk/tanstack-react-start";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Dumbbell, Flame, LayoutDashboard, LogOut, ShoppingCart } from "lucide-react";
import { useTRPC } from "../integrations/trpc";

/** Shared by the nav links and the log-out button, which is an action, not a link. */
function navItemClasses({ active, disabled }: { active?: boolean; disabled?: boolean }) {
  return `flex items-center gap-2.5 rounded-md px-3 py-2 font-condensed text-body-sm uppercase tracking-wide transition-colors duration-fast ${
    active
      ? "bg-surface-raised text-accent-secondary"
      : disabled
        ? "cursor-not-allowed text-disabled"
        : "text-muted hover:text-primary"
  }`;
}

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
  const classes = navItemClasses({ active, disabled });

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
      <LogOutButton />
    </div>
  );
}

function LogOutButton() {
  // clerk-js finishes loading some time *after* hydration, and until it does
  // signOut() resolves without clearing the session: the click navigates to
  // /sign-in while leaving the user signed in, and the next page load walks
  // straight back into the app. ClerkLoaded/ClerkLoading close that window.
  //
  // useAuth().isLoaded is not the gate to use here — it is already true on the
  // first client render, because ClerkProvider seeds it from the SSR auth state
  // long before clerk-js itself is ready.
  return (
    <>
      <ClerkLoading>
        <button type="button" className={navItemClasses({ disabled: true })} disabled>
          <LogOut size={16} strokeWidth={1.75} />
          Log out
        </button>
      </ClerkLoading>
      <ClerkLoaded>
        <LoadedLogOutButton />
      </ClerkLoaded>
    </>
  );
}

function LoadedLogOutButton() {
  const { signOut } = useClerk();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className={navItemClasses({})}
      data-testid="log-out"
      onClick={async () => {
        // Clear Clerk's session first, then navigate — going the other way would
        // let _shell's guard re-run while the session is still live.
        await signOut();
        await navigate({ to: "/sign-in" });
      }}
    >
      <LogOut size={16} strokeWidth={1.75} />
      Log out
    </button>
  );
}
