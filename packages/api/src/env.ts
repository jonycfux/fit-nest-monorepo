export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  PORT: Number(process.env.PORT ?? 4000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  // Verifies session tokens and reads the user's profile at provision time
  // (ADR 0009). Never sent to a client.
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
  // Opt-in only (never set in a real deploy config): lets a request that carries
  // the dev cookie resolve to the fixed seeded user instead of a Clerk token.
  // Scoped per-request rather than per-server so the seed and auth Playwright
  // suites can share one server — see createContext.
  DEV_AUTH_BYPASS: process.env.DEV_AUTH_BYPASS === "true",
};
