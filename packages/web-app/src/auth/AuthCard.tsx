import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

// NOTE: colour roles in @fitnest/shared's preset are keyed by their full name
// ("text-muted", "border-default"), so the generated utilities are
// `text-text-muted` / `border-border-default`. The shorter forms used elsewhere
// in this app (`text-muted`, `border-default`) generate no CSS — see the
// pre-existing issue noted alongside ADR 0009.

/**
 * Shared chrome for /sign-in and /sign-up. These routes sit outside the _shell
 * layout (no sidebar, no auth guard), so they carry their own centred frame.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-app px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 text-center font-condensed font-bold text-h3 uppercase tracking-wide">
          <span className="text-text-heading">Fit</span>
          <span className="text-accent-secondary">Nest</span>
        </div>

        <div className="rounded-lg border border-border-default bg-surface-raised p-6">
          <h1 className="font-condensed text-h4 text-text-heading uppercase tracking-wide">
            {title}
          </h1>
          <p className="mt-1 mb-6 text-body-sm text-text-muted">{subtitle}</p>
          {children}
        </div>

        <p className="mt-6 text-center text-body-sm text-text-muted">{footer}</p>
      </div>
    </div>
  );
}

/** `htmlFor` must match the `id` of the control passed as `children`. */
export function AuthField({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block font-condensed text-body-sm text-text-muted uppercase tracking-wide"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Clerk surfaces validation failures (weak password, email already taken, wrong
 * credentials) as an errors array; this renders whatever it gives us rather than
 * mapping to our own copy, so new Clerk error cases aren't swallowed.
 */
export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      data-testid="auth-error"
      className="mb-4 rounded-md border border-state-danger bg-state-danger/10 px-3 py-2 text-body-sm text-state-danger"
    >
      {message}
    </p>
  );
}

export function AuthSwitchLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-accent-secondary hover:underline">
      {children}
    </Link>
  );
}
