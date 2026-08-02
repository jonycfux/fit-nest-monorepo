import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { eq } from "drizzle-orm";
import { type DB, db } from "./db/client.js";
import { users } from "./db/schema.js";
import { DEV_USER_EMAIL } from "./db/seed.js";
import { env } from "./env.js";

export type User = { id: string; email: string };

export type Context = {
  db: DB;
  token: string | undefined;
  user: User | null;
};

// The return type is declared explicitly: without it, control-flow analysis
// narrows the stubbed `user` to the literal `null`, so `Context["user"]` would
// lose its `User | null` union and `protectedProcedure`'s guard would narrow to
// `never`. Delete this note once real auth populates `user`.
export async function createContext({ req }: FetchCreateContextFnOptions): Promise<Context> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  // TODO: verify `token` and load the user. Real auth isn't wired up yet; with
  // DEV_AUTH_BYPASS set (dev only, see env.ts), fall back to the seeded dev user
  // (`db/seed.ts`) instead of requiring a token.
  let user: User | null = null;
  if (env.DEV_AUTH_BYPASS) {
    const [devUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, DEV_USER_EMAIL));
    user = devUser ?? null;
  }

  return { db, token, user };
}
