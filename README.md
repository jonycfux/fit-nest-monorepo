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

---

## Conventions

- Clients import **only `type AppRouter`** from `@fitnest/api` (keeps server code out of client bundles).
- `web-app` and `mobile-app` are intentionally **outside** the root `tsc --build` graph — they build via Vite/Metro with bundler-mode tsconfigs.
- Each app's Tailwind `content` globs include `../shared/src/**` so the shared variant classes are generated.
