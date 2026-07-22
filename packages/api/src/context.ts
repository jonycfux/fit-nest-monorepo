import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { type DB, db } from "./db/client.js";

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
export async function createContext({
  req,
}: FetchCreateContextFnOptions): Promise<Context> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  // TODO: verify `token` and load the user. Stubbed until auth is wired up.
  const user: User | null = null;

  return { db, token, user };
}
