# Fitnest

A TypeScript monorepo for the Fitnest fitness app — a shared backend serving a web app and a mobile app, with end-to-end type safety.

## Packages

| Package | Description | Stack |
| --- | --- | --- |
| `@fitnest/api` | Standalone, independently-deployable backend | tRPC v11 · Hono · Drizzle ORM · PostgreSQL |
| `@fitnest/shared` | Shared design layer, utils, constants, and types | Tailwind preset · `tailwind-variants` |
| `@fitnest/web-app` | Web client (SSR) | TanStack Start (Vite + Nitro) · Tailwind v3 |
| `@fitnest/mobile-app` | Mobile client | Expo SDK 56 · React Native · NativeWind v4 |

```
fitnest-monorepo/
├── packages/
│   ├── api/         # tRPC server + Drizzle/Postgres data layer
│   ├── shared/      # design tokens + variants + shared utils/types
│   ├── web-app/     # TanStack Start
│   └── mobile-app/  # Expo / React Native
├── tsconfig.base.json   # shared compiler options
├── tsconfig.json        # project-references orchestrator
└── biome.json           # single root linter/formatter
```

## Getting started

### Clerk setup (required before the app will run)

Authentication is Clerk, email/password only. Some of this configuration lives in the
Clerk dashboard and **cannot be committed**, so a fresh clone or a new Clerk instance
must apply it by hand. See [ADR 0009](docs/adr/0009-clerk-identity-jit-provisioning.md).

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. **Configure → Email, phone, username:**
   - Enable **Email address** as an identifier, and enable **Password**.
   - Turn **off** email verification ("Verify at sign-up"). The app has no
     verification step, so leaving this on makes sign-up hang after submit.
3. **Configure → SSO connections:** disable every OAuth provider. None are wired up.
4. **Configure → API keys:** copy the keys into your env files:

```bash
# packages/api/.env
CLERK_SECRET_KEY=sk_test_...

# packages/web-app/.env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

If the instance drifts from this configuration, the sign-in/sign-up forms report an
explicit `needs an extra step (<status>)` error rather than failing silently.

### Running

```bash
npm install

# API (needs a Postgres DATABASE_URL — see packages/api/.env.example)
npm run db:migrate -w @fitnest/api
npm run dev        -w @fitnest/api        # http://localhost:4000

# Web (set VITE_API_URL — see packages/web-app/.env.example)
npm run dev        -w @fitnest/web-app    # http://localhost:3000

# Mobile (set EXPO_PUBLIC_API_URL — see packages/mobile-app/.env.example)
npm run ios        -w @fitnest/mobile-app
```

Repo-wide checks:

```bash
npm run build       # tsc --build (project references)
npm run typecheck   # tsc --build --noEmit
npm run lint        # biome lint .
npm run format      # biome format --write .
```

### End-to-end tests (Playwright)

Two suites, described in [`specs/`](specs/) and sharing one pair of servers that Playwright boots itself (reusing any you already have running locally):

| Project | Spec | What it covers |
| --- | --- | --- |
| `seed-{chromium,firefox,webkit}` | `tests/seed.spec.ts` | The dev fixture data from `db/seed.ts` renders correctly ([plan](specs/seed.plan.md)) |
| `auth` | `tests/auth.spec.ts` | Real Clerk register → provision → sign out → sign in ([plan](specs/auth.plan.md)) |

```bash
npm run db:migrate -w @fitnest/api
npm run db:seed -w @fitnest/api    # idempotent, safe to re-run
npx playwright test

npx playwright test --project=auth            # auth only
npx playwright test --project=seed-chromium   # seed only; needs no Clerk keys
```

**How the two coexist.** The API runs with `DEV_AUTH_BYPASS=true`, but that flag only
grants the *capability* to resolve to the seeded `dev@fitnest.local` user — a request
claims it by carrying the `fitnest_dev_user` cookie. The seed project ships that cookie
in `tests/.auth/dev-user.json`; the auth project never sets it, so it sees a genuinely
signed-out visitor. That's what lets both run against one server, which Playwright's
global `webServer` requires.

**The auth suite talks to a real Clerk instance.** It needs `CLERK_SECRET_KEY` and
`VITE_CLERK_PUBLISHABLE_KEY` readable from the env files above, registers one
throwaway `+clerk_test` account per run, and deletes it from both Clerk and Postgres
in teardown. Its first assertion after sign-up has a long timeout because just-in-time
provisioning seeds the exercise library inline on that request.

The same flow runs in CI against a Postgres service container — see [`.github/workflows/playwright.yml`](.github/workflows/playwright.yml).

---

## Architecture decision changelog

A log of the major **locked-in** architectural decisions, with rationale and notable alternatives considered.

### 2026-06-30

#### Monorepo foundation
- **npm workspaces + TypeScript project references** (`tsc --build`) for ordered, incremental builds.
- **Biome** as the single root linter/formatter (one shared `biome.json`).
- Layout: everything flat under `packages/*`.

#### API layer → **tRPC** (standalone server)
- **Decision:** tRPC v11 as the API layer, served standalone via **Hono + `@trpc/server` fetch adapter** with CORS for the web origin.
- **Why:** maximum end-to-end type safety with **zero codegen** in an all-TypeScript repo; both clients import only `type AppRouter` (type-only → no server code in client bundles).
- **Standalone (not co-located on web's Nitro):** frontends are decoupled from backend deploys.
  - _Consequence:_ mobile bakes `EXPO_PUBLIC_API_URL` at build time, and the API must stay backward-compatible for shipped binaries.
- **Alternatives considered:** GraphQL (heavier, needs codegen — overkill for two first-party clients); typed REST / ts-rest (more boilerplate, weaker inference); TanStack Start server functions (web-only, can't serve mobile with the same typing).

#### Data layer → **Drizzle + PostgreSQL**
- **Decision:** Drizzle ORM on PostgreSQL; schema, client, and migrations live in `packages/api/src/db`.
- **Why:** TS-first schema with **inferred types and no codegen**; `drizzle-zod` makes the DB schema the **single source of truth** that also drives tRPC input validation; tiny runtime → cheap cold starts.
- **Hosting:** Neon recommended (serverless, scale-to-zero) — not yet provisioned.
- **Alternatives considered:** Prisma (heavier client, own DSL + codegen); Kysely (more boilerplate); MongoDB (rejected — works against the relational + type-safety goal).

#### Client data fetching → **TanStack Query + tRPC**
- Both clients use `@tanstack/react-query` + `@trpc/tanstack-react-query`.
- Web wires SSR prefetch/hydration via `@tanstack/react-router-ssr-query`; mobile wires `onlineManager` (NetInfo) + `focusManager` (AppState) for native online/focus semantics.

#### Cross-platform styling → **Tailwind v3 + NativeWind v4**
- **Decision:** Tailwind utility-class syntax everywhere — web-app on **Tailwind v3** (PostCSS), mobile-app on **NativeWind v4**. `@fitnest/shared` exports a CommonJS Tailwind **preset** (token source of truth) + `tailwind-variants` class definitions used by both platforms.
- **Why Tailwind v3 (not v4):** NativeWind v4 (stable) only supports Tailwind v3; Tailwind v4 support exists only in **NativeWind v5 (preview)** — not production-ready (broken dark mode, codegen workarounds, unproven on Expo SDK 56). web-app was converted v4 → v3 to share one config line. _Revisit v4 once NativeWind v5 is stable._
- **Why no `react-native-web`:** chose shared tokens + variant class strings over universal components, to avoid pulling react-native-web (and its Flow-transpile / SSR / hydration pitfalls) into the TanStack Start app.

#### Package rename
- `@fitnest/components` → **`@fitnest/shared`** (now the design + shared-code layer, with `themes/`, `utils/`, `constants/`, `variants/`).

### 2026-07-05

#### Domain model → **glossary (`CONTEXT.md`) + ADRs** (design only, not yet implemented)
- **What:** first domain-modeling pass on the training core — the vocabulary and rules for plans, workouts, exercises, and logging. Captured as a ubiquitous-language glossary in [`CONTEXT.md`](CONTEXT.md) and four decision records in [`docs/adr/`](docs/adr/).
- **Shape:** two mirrored sides joined by the `Template Exercise`:
  - **Planning:** `Plan → Workout → Prescribed Exercise → Prescribed Set` (composed **by reference** — join tables — so you author once and reuse).
  - **Performance:** `Logged Workout → Logged Exercise → Logged Set` (**performed-only**: records what happened, no prescription snapshot, no adherence).
- **Locked decisions (see ADRs):**
  - [ADR 0001](docs/adr/0001-reference-composed-plans-performed-only-logs.md) — reference-composed plans, performed-only logs, live exercise reference + soft-delete (**Archive**).
  - [ADR 0002](docs/adr/0002-per-user-ownership-no-cross-user-sharing.md) — every entity is **per-user**; no cross-user sharing; classics come from a (not-yet-built) signup **seed script**.
  - [ADR 0003](docs/adr/0003-exercise-attributes-live-at-their-owning-level.md) — exercise attributes (movement-pattern, target-muscles, equipment, attachment, backups) live at their **owning level** and are read live, never copied down; only `Note` spans all three exercise levels.
  - [ADR 0004](docs/adr/0004-exercise-variants-detached-clone-with-breadcrumb.md) — exercise **variants** are detached clones that record an immutable `variantOf` breadcrumb, with no family behavior (yet).
- **Status / next continuation:** this is **design + docs only** — `packages/api/src/db/schema.ts` still holds just the placeholder `users` + `fitnessPlans` tables. **Next step:** translate `CONTEXT.md` (core nouns + the six attribute fields + the variant lineage) into Drizzle tables and migrations, then replace the placeholder `publicProcedure` handlers with per-user-scoped ones once identity/auth lands.
- **Open design item (parked):** user-defined **named backup collections** per Template Exercise — the flat backup model is kept additive-compatible for it (see the `Backup Exercise` entry in `CONTEXT.md`).

### 2026-08-23

#### Authentication → **Clerk** (email/password), identity split from ownership
- **Decision:** Clerk owns identity (credentials, sessions); the `users` table stays the ownership anchor for every per-user table, joined by a new `clerkUserId` column. See [ADR 0009](docs/adr/0009-clerk-identity-jit-provisioning.md).
- **Two integrations, not one:** the Clerk TanStack Start quickstart covers the frontend only. Because `@fitnest/api` is a **standalone server on a different origin**, it verifies session tokens itself with `@clerk/backend` — the web app sends `Authorization: Bearer <jwt>`. This also works unchanged for Expo later.
- **Just-in-time provisioning:** a user's local row is created and seeded on their first authenticated request, not by a `user.created` webhook. No tunnel needed in dev or CI, and no race between the sign-up redirect and webhook delivery. _Consequence:_ the first request after sign-up pays for the exercise-library insert inline.
- **Seeding split:** real registrants get the **exercise library only**; the demo PPL plan and its six back-dated sessions stay dev fixtures (fabricating them would report set volume for training the user never did).
- **Schema:** the four FKs into `users` now `ON DELETE CASCADE` (making account deletion and test teardown one statement), and `fitness_plans.user_id` tightened to `NOT NULL` — completing the migration its own placeholder comment described.
- **Scope:** web only. `mobile-app` has no navigation or screens to gate yet.
- **Alternatives considered:** Clerk session cookie + `authenticateRequest` (needs cross-origin credentials + satellite config, and doesn't work for React Native); proxying tRPC through the web app's Nitro server (reintroduces the coupling the standalone API avoids); webhook-driven provisioning (needs a public URL, and races the browser).

---

## Conventions

- Clients import **only `type AppRouter`** from `@fitnest/api` (keeps server code out of client bundles).
- `web-app` and `mobile-app` are intentionally **outside** the root `tsc --build` graph — they build via Vite/Metro with bundler-mode tsconfigs.
- Each app's Tailwind `content` globs include `../shared/src/**` so the shared variant classes are generated.
