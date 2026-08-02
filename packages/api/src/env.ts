export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  PORT: Number(process.env.PORT ?? 4000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  // Opt-in only (never set in a real deploy config): falls back to a fixed
  // seeded user instead of requiring a verified token. Unblocks UI work while
  // real auth is unbuilt — see createContext.
  DEV_AUTH_BYPASS: process.env.DEV_AUTH_BYPASS === "true",
};
