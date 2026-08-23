# Register & Login — Test Plan

Verifies the Clerk email/password flow end to end: a new visitor can register, is
provisioned just-in-time in Postgres with a seeded exercise library, can sign out,
and can sign back in. See [ADR 0009](../docs/adr/0009-clerk-identity-jit-provisioning.md).

**Assumptions (starting state for every scenario):** Postgres is migrated, the API
and web-app dev servers are running, and the Clerk instance is configured per the
README (email + password enabled, **email verification off**, no OAuth providers).
`CLERK_SECRET_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` are readable by the Playwright
process, which fetches a Clerk testing token once per run to bypass bot protection.

These scenarios run **serially and share one throwaway account** — scenario 2 signs
in as the user scenario 1 registers. The account is deleted from both Clerk and
Postgres after the suite finishes, whether or not it passed.

Unlike the seed suite, these scenarios never set the `fitnest_dev_user` cookie, so
they see a genuinely signed-out visitor and exercise the real auth path.

## 1. A signed-out visitor is redirected to sign-in

1. Navigate to `/plans`.
2. **Expect:** the URL becomes `/sign-in`, carrying a `redirect` search param
   pointing back at `/plans`.
3. **Expect:** a "Sign in" heading is visible.

## 2. Registering creates an account, provisions it, and seeds the library

1. Navigate to `/sign-up`.
2. **Expect:** a "Create account" heading is visible.
3. Fill the email field with the run's unique `+clerk_test` address, and the
   password field with the test password.
4. Submit the form.
5. **Expect:** the URL becomes `/plans` — no email-verification step appears,
   confirming verification is disabled on the instance.
6. **Expect:** a "Dashboard" heading is visible, i.e. the session is active and
   the `_shell` guard let the request through.
7. **Expect:** the "Your plans" section reports no plans — a real registrant gets
   the exercise library only, never the demo plan or its logged sessions.
8. Navigate to `/library`.
9. **Expect:** an "Exercise Library" heading is visible and "Bench Press" is
   listed, confirming just-in-time provisioning ran the seed for this user.
10. **Expect (database):** a `users` row exists for this email, with a
    `clerk_user_id` starting `user_`, and it owns the full seeded exercise count.

## 3. Signing out returns the visitor to sign-in

1. Continue from the registered, signed-in session.
2. Click "Log out" in the sidebar.
3. **Expect:** the URL becomes `/sign-in`.
4. Navigate to `/plans`.
5. **Expect:** the URL is `/sign-in` again — the session is genuinely cleared,
   not merely navigated away from.

## 4. Signing back in restores the same account and its data

1. Navigate to `/sign-in`.
2. Fill the email and password fields with the account registered in scenario 2.
3. Submit the form.
4. **Expect:** the URL becomes `/plans` and a "Dashboard" heading is visible.
5. Navigate to `/library`.
6. **Expect:** "Bench Press" is listed — the same library, so signing in resolved
   the existing user rather than provisioning a second one.
7. **Expect (database):** still exactly one `users` row for this email, i.e. the
   `ON CONFLICT` guard held and login did not re-seed.

## 5. Wrong credentials are rejected with a visible error

1. Sign out (scenario 4 left an active session, and Clerk's sign-in behaves
   differently when one exists).
2. Fill the email field with the registered address and the password field with
   an incorrect password.
3. Submit the form.
4. **Expect:** an alert is visible reporting the failure.
5. **Expect:** the URL is still `/sign-in`.

## Out of scope

- OAuth / social sign-in — not enabled on the instance.
- Email verification, password reset, and MFA — deliberately disabled for now.
- Mobile (Expo) auth — the mobile app has no screens to gate yet.
- Account deletion from the UI; the cascade it relies on is covered indirectly by
  this suite's teardown.
