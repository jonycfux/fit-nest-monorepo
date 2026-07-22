import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../db/client.js";
import { templateExercises } from "../db/schema.js";

// The drizzle transaction handle, derived from the db type.
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

// `.returning()` / single-row reads type as `T | undefined`; an insert we just
// made always yields a row, so narrow it (a missing row is a server fault).
export function firstOrThrow<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return row;
}

// ADR 0002: a user may only reference their own Template Exercises. Throws if
// any id is unknown or owned by someone else.
export async function assertOwnedExercises(tx: Tx, userId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  const owned = await tx
    .select({ id: templateExercises.id })
    .from(templateExercises)
    .where(
      and(
        eq(templateExercises.userId, userId),
        inArray(templateExercises.id, unique),
      ),
    );
  if (owned.length !== unique.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unknown or unowned Template Exercise.",
    });
  }
}
