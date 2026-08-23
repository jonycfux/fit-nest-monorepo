import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { users } from "./schema.js";
import { seedUserData } from "./seed-user.js";

// Fixed dev user, referenced by context.ts's DEV_AUTH_BYPASS fallback.
export const DEV_USER_EMAIL = "dev@fitnest.local";

// The dev user predates Clerk and has no account there, but `clerk_user_id` is
// NOT NULL and unique. A sentinel keeps the column honest: it can never collide
// with a real Clerk id (those are `user_*`), so no token can ever resolve to it —
// the dev user is reachable only through the DEV_AUTH_BYPASS path.
export const DEV_USER_CLERK_ID = "seed_dev_user";

async function seed() {
  const [existing] = await db.select().from(users).where(eq(users.email, DEV_USER_EMAIL));
  if (existing) {
    console.log(`Dev user already seeded (${existing.id}). Skipping.`);
    return;
  }

  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        clerkUserId: DEV_USER_CLERK_ID,
        email: DEV_USER_EMAIL,
        name: "Dev User",
      })
      .returning();
    if (!user) throw new Error("Failed to insert dev user");

    // The dev user is the fixture the seed Playwright suite asserts against, so
    // it gets the demo plan and back-dated sessions that real users don't.
    await seedUserData(tx, user.id, { includeDemoPlan: true });

    console.log(`Seeded dev user ${user.id} (${DEV_USER_EMAIL}) with the demo plan.`);
  });
}

// Only run when invoked directly (`npm run db:seed`) — importing DEV_USER_EMAIL
// from context.ts must not trigger seeding on every server boot.
if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
