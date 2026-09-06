import { type SQL, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/**
 * SQL expressions used inside index definitions in `schema.ts`.
 *
 * They live here, not inline in the schema, so the schema file stays free of
 * raw SQL fragments and there is exactly one place to review. The signatures
 * only accept a `PgColumn`, never a string, so a caller cannot pass text
 * through into the emitted DDL — drizzle serialises a column as a quoted
 * identifier, so the interpolation below can only ever produce a column
 * reference.
 */

/**
 * `lower(btrim(col))` — the normalised form both name-uniqueness indexes match
 * on, so "Bench Press", "bench press" and " Bench Press " collide.
 */
export function normalizedName(column: PgColumn): SQL {
  return sql`lower(btrim(${column}))`;
}
