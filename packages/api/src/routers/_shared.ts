import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { DB } from "../db/client.js";
import { backupCollections, templateExercises } from "../db/schema.js";

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
    .where(and(eq(templateExercises.userId, userId), inArray(templateExercises.id, unique)));
  if (owned.length !== unique.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unknown or unowned Template Exercise.",
    });
  }
}

// ADR 0002 again, one level down: a Backup Collection is reachable only through
// the Template Exercise that owns it. Returns the owning template's id.
export async function assertOwnedCollection(tx: Tx, userId: string, collectionId: string) {
  const [row] = await tx
    .select({ templateExerciseId: backupCollections.templateExerciseId })
    .from(backupCollections)
    .innerJoin(templateExercises, eq(backupCollections.templateExerciseId, templateExercises.id))
    .where(and(eq(backupCollections.id, collectionId), eq(templateExercises.userId, userId)));
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Unknown or unowned Backup Collection." });
  }
  return row.templateExerciseId;
}

// The unnamed default collection (ADR 0011), created on first use. Every backup
// link needs a collection, so the flat "just give me a backup list" API path
// lazily materialises one rather than making callers know collections exist.
export async function defaultCollectionId(tx: Tx, templateExerciseId: string) {
  const [existing] = await tx
    .select({ id: backupCollections.id })
    .from(backupCollections)
    .where(
      and(
        eq(backupCollections.templateExerciseId, templateExerciseId),
        isNull(backupCollections.name),
      ),
    );
  if (existing) return existing.id;
  return firstOrThrow(
    await tx
      .insert(backupCollections)
      .values({ templateExerciseId, name: null, position: 0 })
      .returning({ id: backupCollections.id }),
  ).id;
}

// Postgres unique-violation. The only unique constraints a user can trip are the
// two name rules (Template Exercise name per user, Backup Collection name per
// exercise), so surface them as CONFLICT rather than an opaque 500 — the clone
// form needs to render "you already have one of those" inline when suggestName
// lands on an existing name.
export function rethrowAsConflict(error: unknown, message: string): never {
  if (error instanceof Error && "code" in error && error.code === "23505") {
    throw new TRPCError({ code: "CONFLICT", message, cause: error });
  }
  throw error;
}
