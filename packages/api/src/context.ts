import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { eq } from "drizzle-orm";
import { verifyToken } from "@clerk/backend";
import { DEV_USER_HEADER } from "./auth/clerk.js";
import { resolveOrProvisionUser, type User } from "./auth/provision.js";
import { type DB, db } from "./db/client.js";
import { users } from "./db/schema.js";
import { DEV_USER_EMAIL } from "./db/seed.js";
import { env } from "./env.js";

export type { User };

export type Context = {
  db: DB;
  user: User | null;
};

async function devUser(): Promise<User | null> {
  const [row] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, DEV_USER_EMAIL));
  return row ?? null;
}

export async function createContext({ req }: FetchCreateContextFnOptions): Promise<Context> {
  // Dev bypass is opt-in per request, not per server: the flag grants the
  // capability, the header claims it. That lets the seed suite (which asserts on
  // the fixture user's demo data) and the auth suite (which must see a genuinely
  // signed-out visitor) run against a single server. See ADR 0009.
  if (env.DEV_AUTH_BYPASS && req.headers.get(DEV_USER_HEADER) === "1") {
    return { db, user: await devUser() };
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { db, user: null };

  let clerkUserId: string;
  try {
    const claims = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
    clerkUserId = claims.sub;
  } catch {
    // Expired, malformed, or wrong-instance token — indistinguishable from no
    // token at all as far as the caller is concerned; protectedProcedure turns
    // this into UNAUTHORIZED.
    return { db, user: null };
  }

  return { db, user: await resolveOrProvisionUser(clerkUserId) };
}
