import { clerkSetup } from "@clerk/testing/playwright";

/**
 * Fetches a Clerk testing token once per run and puts it on `process.env`, where
 * the test workers inherit it. Without it, Clerk's bot protection rejects the
 * sign-ups the auth suite makes from a headless browser.
 *
 * This has to be top-level rather than scoped to the `auth` project: Playwright
 * has no per-project globalSetup, and a setup *project* would run in its own
 * worker process, so the env it sets would never reach the auth worker.
 *
 * Missing credentials are a warning, not an error — `FullConfig.projects` lists
 * every configured project regardless of `--project`, so this can't tell whether
 * the auth suite was actually selected. The auth spec skips itself instead, which
 * keeps `--project=seed-chromium` working on a machine with no Clerk keys.
 */
export default async function globalSetup() {
  if (!hasClerkCredentials()) {
    console.warn(
      "[clerk] CLERK_SECRET_KEY / VITE_CLERK_PUBLISHABLE_KEY not set — the auth " +
        "suite will be skipped. See the Clerk setup section in README.md.",
    );
    return;
  }

  await clerkSetup({ publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY });
}

export function hasClerkCredentials() {
  return Boolean(process.env.CLERK_SECRET_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY);
}
