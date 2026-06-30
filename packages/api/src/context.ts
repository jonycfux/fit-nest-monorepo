import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { db } from "./db/client.js";

export type User = { id: string; email: string };

export async function createContext({ req }: FetchCreateContextFnOptions) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  // TODO: verify `token` and load the user. Stubbed until auth is wired up.
  const user: User | null = null;

  return { db, token, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
