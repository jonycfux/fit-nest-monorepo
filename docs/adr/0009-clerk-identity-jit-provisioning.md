# Clerk owns identity; the local `users` row owns ownership, provisioned just-in-time

Authentication is **Clerk** (email/password only — no OAuth, no email verification for now). Clerk owns credentials, sessions, and the sign-up lifecycle. It does **not** own the domain: the `users` table remains the FK target for every per-user table, and gains a single `clerk_user_id` column joining the two. A user's local row is created **just-in-time**, on their first authenticated request, and is seeded at that moment with the Template Exercise library — and nothing else.

The shaping constraint is that `packages/api` is a **standalone Hono server on a different origin** from the web app (ADR: standalone deploy). Clerk's TanStack Start quickstart covers only the frontend; the API has to verify tokens itself. So this is two integrations, not one.

## Considered Options

### Where the API gets its identity

- **Bearer token verified with `@clerk/backend`** (chosen): the web app calls Clerk's `getToken()` and sends `Authorization: Bearer <jwt>`; `createContext` runs `verifyToken`. Stateless, no cross-origin cookie handling, and works unchanged for Expo later.
- **Clerk session cookie + `authenticateRequest`:** requires `credentials: "include"`, exact-origin CORS, and Clerk satellite-domain configuration; does not work for React Native. Rejected.
- **Proxy tRPC through the TanStack Start server:** matches the quickstart most literally but reintroduces the coupling the standalone API exists to avoid, and adds a network hop. Rejected.

### How Clerk identity maps to a local user

- **`clerk_user_id text not null unique`, uuid PK unchanged** (chosen): one indexed lookup on the `sub` claim. The domain model never depends on Clerk's id format, and swapping providers is a column change rather than a schema rewrite.
- **Clerk's id as the PK:** would rewrite every FK from `uuid` to `text` and hard-couple the schema to Clerk. Rejected.
- **Match on email:** emails are mutable and a weak identity key. Rejected.

### When the local row gets created

- **Just-in-time in `createContext`** (chosen): an authenticated request whose `sub` has no local row creates and seeds it in one transaction.
- **`user.created` webhook:** the event-driven option, and the only one that keeps the first request fast. But it needs a publicly reachable URL (a tunnel in dev, and in CI), and it *races* the browser — Clerk does not hold the redirect while delivering, so the user's first page load can arrive before the row exists. Rejected for now; see below.
- **Client-side provisioning mutation:** trusts the client to call it; closing the tab mid-flow leaves a permanently empty account. Rejected.

## What a new user is seeded with

Real registrants receive the **Template Exercise library only** (~156 exercises, their muscle tags, and the backup links between them) — this is what CONTEXT.md's "new users are seeded with a copy of the classic exercises" promises. They do **not** receive the demo "PPL 6-Week Hypertrophy" plan or its six back-dated Logged Workouts: those are dev fixtures, and fabricating them for a real user would report set volume for training they never did.

`seedUserData(tx, userId, { includeDemoPlan })` is the single seeding path; `db/seed.ts` (the `db:seed` script, which creates the fixture dev user) is the only caller that passes `true`.

## Consequences

- **The first request after sign-up is slow.** It inserts the whole library inline. This is the accepted price of not running webhook infrastructure. The webhook remains available later as a pure warm-up, with JIT staying as the backstop — that combination is strictly better than the webhook alone, which has no backstop.
- **Provisioning must be idempotent.** A single page load fires several tRPC batches, each of which can find no row. The unique constraint on `clerk_user_id` plus `ON CONFLICT DO NOTHING` makes the first writer win; losers re-read.
- **Deleting a user now deletes their data.** The four FKs into `users` (`template_exercises`, `fitness_plans`, `workouts`, `logged_workouts`) cascade, matching how every aggregate already cascades internally. This is what makes both the Playwright teardown and future account deletion a single statement.
- **`fitness_plans.user_id` is now NOT NULL**, completing the migration its own placeholder comment described ("tightens to NOT NULL alongside the public → per-user handlers"); the handlers had already moved to `protectedProcedure`.
- **Email and name come from the Clerk Backend API at provision time**, not from session-token claims. Custom claims are configured by clicking in the Clerk dashboard, so a fresh instance would fail at runtime with no repo-visible cause. The extra API call happens once per user. Email/password sign-up collects no name, so `users.name` falls back to the email local-part.
- **`DEV_AUTH_BYPASS` is now opt-in per request.** The env flag grants the capability; a request claims it by carrying the `fitnest_dev_user` cookie (translated to an `x-dev-user` header for the cross-origin API, since the tRPC client deliberately sends no credentials). This lets the seed suite — which asserts against the fixture user's demo data — and the auth suite — which must observe a genuinely signed-out visitor — run against **one** set of servers, which Playwright's global `webServer` requires. The web guard honours the cookie only under `import.meta.env.DEV`.
- **The seeded dev user carries a `seed_dev_user` sentinel** in `clerk_user_id`. It cannot collide with a real Clerk id (`user_*`), so no token can ever resolve to it; the fixture is reachable only through the bypass.
- **Clerk instance configuration is clickops** and therefore not committed. The required settings — password enabled, email verification off, no OAuth providers — are listed in README.md. A drifted instance surfaces as an explicit "needs an extra step (`<status>`)" error on the auth forms rather than a blank screen.
- **Mobile is untouched.** `packages/mobile-app` has no navigation or screens to gate yet. The bearer-token design already accommodates it, and `expo-secure-store` is installed for the eventual token cache.

## Unrelated issue noticed while implementing

The colour roles in `@fitnest/shared`'s Tailwind preset are keyed by their **full** name (`text-muted`, `border-default`), so the generated utilities are `text-text-muted` and `border-border-default`. The shorter forms used throughout `ui/` and `Sidebar.tsx` (`text-muted`, `text-heading`, `border-default`, `text-disabled`) match no key and **generate no CSS**. The new auth components use the forms that actually resolve. Fixing the pre-existing usages is a separate change.
