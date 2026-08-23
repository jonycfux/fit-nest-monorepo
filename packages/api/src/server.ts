import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { DEV_USER_HEADER } from "./auth/clerk.js";
import { createContext } from "./context.js";
import { env } from "./env.js";
import { appRouter } from "./router.js";

const app = new Hono();

// Standalone, independently-deployable server. CORS is required because the
// browser (web-app) calls this from a different origin. Auth travels as an
// `Authorization` bearer header rather than a cookie (ADR 0009), so both custom
// headers must be allowed through preflight.
app.use(
  "/trpc/*",
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", DEV_USER_HEADER],
  }),
);

app.all("/trpc/*", (c) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => c.text("fitnest api"));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});
