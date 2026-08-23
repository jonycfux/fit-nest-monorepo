import { createClerkClient } from "@clerk/backend";
import pg from "pg";

/**
 * Helpers for the throwaway account the auth suite registers. Every run creates a
 * fresh one and deletes it afterwards, in both Clerk and Postgres — provisioning
 * is just-in-time (ADR 0009), so deleting the Clerk user alone would strand the
 * local row and its ~156 seeded exercises.
 */

/**
 * Clerk treats addresses whose subaddress is exactly `+clerk_test` as test
 * fixtures: they never send real email and are safe to create repeatedly. The
 * timestamp therefore has to go in the local part *before* the plus — appending
 * it after `+clerk_test` breaks the convention, and Clerk rejects the address
 * outright. The domain must be a real TLD (`.local` is rejected).
 */
export function makeTestEmail() {
  return `fitnest_e2e_${Date.now()}+clerk_test@example.com`;
}

/** Meets Clerk's default strength rules and is not a known-breached password. */
export const TEST_PASSWORD = "Fitnest-e2e-9271-xk";

function clerk() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY ?? "" });
}

export async function deleteTestUser(email: string) {
  // Postgres first: the local row is keyed by clerk_user_id, so removing the
  // Clerk account first would lose the handle we need to find it. The four user
  // FKs cascade, so this one statement takes the whole library with it.
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("DELETE FROM users WHERE email = $1", [email]);
  } finally {
    await pool.end();
  }

  const { data } = await clerk().users.getUserList({ emailAddress: [email] });
  for (const user of data) {
    await clerk().users.deleteUser(user.id);
  }
}

/**
 * Reads every local row for an email, so a test can assert both that just-in-time
 * provisioning landed a user in Postgres — not just in Clerk — and that signing in
 * again didn't create a second one.
 */
export async function findLocalUsers(email: string) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query<{
      id: string;
      email: string;
      clerk_user_id: string;
      exercise_count: string;
    }>(
      `SELECT u.id, u.email, u.clerk_user_id,
              (SELECT count(*) FROM template_exercises te WHERE te.user_id = u.id) AS exercise_count
         FROM users u
        WHERE u.email = $1`,
      [email],
    );
    return rows;
  } finally {
    await pool.end();
  }
}
