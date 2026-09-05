import { useSignIn } from "@clerk/tanstack-react-start";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { AuthCard, AuthError, AuthField, AuthSwitchLink } from "../auth/AuthCard";
import { clerkErrorMessage } from "../auth/clerkError";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

type SignInSearch = { redirect?: string };

export const Route = createFileRoute("/sign-in")({
  // `redirect` is set by _shell's guard when it bounces a deep link. Only
  // same-site paths are kept — echoing an arbitrary URL back into a navigation
  // would be an open redirect.
  validateSearch: (search: Record<string, unknown>): SignInSearch => {
    const target = typeof search.redirect === "string" ? search.redirect : undefined;
    return target?.startsWith("/") && !target.startsWith("//") ? { redirect: target } : {};
  },
  component: SignInPage,
});

function SignInPage() {
  // Clerk's signals API: `signIn` is null until Clerk loads, and its methods
  // return `{ error }` rather than throwing.
  const { signIn, fetchStatus } = useSignIn();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const busy = fetchStatus === "fetching";

  // See the note in sign-up.tsx: the signals API replaces the resource object
  // rather than mutating it, so the one captured by the submit handler's
  // closure is stale by the time the call resolves.
  const latestSignIn = useRef(signIn);
  latestSignIn.current = signIn;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!signIn || busy) return;
    setError(null);

    const { error: passwordError } = await signIn.password({
      identifier: email,
      password,
    });
    if (passwordError) {
      setError(clerkErrorMessage(passwordError));
      return;
    }

    // Password is the only enabled strategy and there's no MFA, so valid
    // credentials complete in one step. Both the status check and finalize()
    // have to run against the object the latest render received: the captured
    // one carries neither the completed status nor the created session, and
    // finalizing it throws "Cannot finalize sign-in without a created session".
    const attempted = latestSignIn.current ?? signIn;
    if (attempted.status !== "complete") {
      setError(`Sign-in needs an extra step (${attempted.status}) that this app doesn't handle yet.`);
      return;
    }

    const { error: finalizeError } = await attempted.finalize();
    if (finalizeError) {
      setError(clerkErrorMessage(finalizeError));
      return;
    }

    await navigate({ to: redirect ?? "/plans" });
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          No account yet? <AuthSwitchLink to="/sign-up">Create one</AuthSwitchLink>
        </>
      }
    >
      {/* No `name` on the fields — see the note in sign-up.tsx. */}
      <form onSubmit={onSubmit} noValidate>
        <AuthError message={error} />

        <AuthField htmlFor="email" label="Email">
          <Input
            id="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            required
            data-testid="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </AuthField>

        <AuthField htmlFor="password" label="Password">
          <Input
            id="password"
            type="password"
            icon={Lock}
            autoComplete="current-password"
            required
            data-testid="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </AuthField>

        <Button
          type="submit"
          variant="primary"
          className="mt-2 w-full"
          disabled={!signIn || busy}
          data-testid="submit"
        >
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
