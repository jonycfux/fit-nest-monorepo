import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { seedUserData } from "../db/seed-user.js";
import { clerkClient } from "./clerk.js";

export type User = { id: string; email: string };

async function findByClerkId(clerkUserId: string): Promise<User | null> {
  const [row] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId));
  return row ?? null;
}

/**
 * Resolve the local `users` row for a verified Clerk identity, creating and
 * seeding it if this is the user's first authenticated request (ADR 0009).
 *
 * Provisioning is just-in-time rather than webhook-driven, so a user can never
 * exist in Clerk but be missing here. The cost is that the first request after
 * sign-up pays for the whole exercise-library insert.
 */
export async function resolveOrProvisionUser(clerkUserId: string): Promise<User> {
  const existing = await findByClerkId(clerkUserId);
  if (existing) return existing;

  // Only reached once per user, so an extra round trip to Clerk is cheap. Taking
  // the profile from here rather than from session-token claims keeps the setup
  // in code: custom claims are configured by clicking in the Clerk dashboard,
  // and a missing one would fail at runtime on a fresh instance.
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email = clerkUser.primaryEmailAddress?.emailAddress;
  if (!email) {
    throw new Error(`Clerk user ${clerkUserId} has no primary email address`);
  }
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();

  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        clerkUserId,
        email,
        // Email/password sign-up collects no name, so fall back to the local
        // part rather than leaving the NOT NULL column to fail.
        name: name || (email.split("@")[0] ?? "Athlete"),
      })
      // A single page load fires several tRPC batches, each of which can find no
      // row and try to provision. The unique constraint on clerk_user_id makes
      // the first writer win; the losers no-op and re-read below.
      .onConflictDoNothing({ target: users.clerkUserId })
      .returning({ id: users.id });

    if (!created) return;

    // Real registrants get the exercise library only. The demo plan and its
    // back-dated sessions are dev fixtures — seeding them here would show set
    // volume for training the user never did.
    await seedUserData(tx, created.id, { includeDemoPlan: false });
  });

  const provisioned = await findByClerkId(clerkUserId);
  if (!provisioned) {
    throw new Error(`Failed to provision user for Clerk id ${clerkUserId}`);
  }
  return provisioned;
}
