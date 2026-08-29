import { useSignUp } from "@clerk/tanstack-react-start";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { type FormEvent, useState } from "react";
import { AuthCard, AuthError, AuthField, AuthSwitchLink } from "../auth/AuthCard";
import { clerkErrorMessage } from "../auth/clerkError";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  // Clerk's signals API: `signUp` is null until Clerk loads, and its methods
  // return `{ error }` rather than throwing.
  const { signUp, fetchStatus } = useSignUp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const busy = fetchStatus === "fetching";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!signUp || busy) return;
    setError(null);

    const { error: passwordError } = await signUp.password({
      emailAddress: email,
      password,
    });
    if (passwordError) {
      setError(clerkErrorMessage(passwordError));
      return;
    }

    // Email verification is disabled on the Clerk instance (see README), so the
    // sign-up completes in this single step — there's no verification round
    // trip. If the status isn't complete, the instance config has drifted, and
    // failing loudly beats a blank screen.
    if (signUp.status !== "complete") {
      setError(`Sign-up needs an extra step (${signUp.status}) that this app doesn't handle yet.`);
      return;
    }

    const { error: finalizeError } = await signUp.finalize();
    if (finalizeError) {
      setError(clerkErrorMessage(finalizeError));
      return;
    }

    // The first request after this provisions the user and seeds their exercise
    // library server-side (ADR 0009), so this navigation is slower than usual.
    await navigate({ to: "/plans" });
  }

  return (
    <AuthCard
      title="Create account"
      subtitle="Start building your training plans."
      footer={
        <>
          Already have an account? <AuthSwitchLink to="/sign-in">Sign in</AuthSwitchLink>
        </>
      }
    >
      {/* The fields carry no `name`: their values are React state, so nothing
          reads them from the form — but a `name` would put them in the query
          string if this ever submitted natively (hydration broken, JS blocked),
          leaking the password into the URL, the history, and the server log.
          `autoComplete` keys off `id`/`type`, so it still works. */}
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
            autoComplete="new-password"
            required
            data-testid="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </AuthField>

        {/* Clerk mounts an invisible CAPTCHA here when bot protection is on;
            without this node sign-up fails in the browser. */}
        <div id="clerk-captcha" />

        <Button
          type="submit"
          variant="primary"
          className="mt-2 w-full"
          disabled={!signUp || busy}
          data-testid="submit"
        >
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
