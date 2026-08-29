import { setupClerkTestingToken } from "@clerk/testing/playwright";
import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { hasClerkCredentials } from "./support/clerk-global-setup.js";
import {
  deleteTestUser,
  findLocalUsers,
  makeTestEmail,
  TEST_PASSWORD,
} from "./support/test-user.js";

// Register + login against a real Clerk instance. See specs/auth.plan.md.
test.describe.configure({ mode: "serial" });

// These register a real (throwaway) Clerk account, so they can't run without
// credentials. Skipping is visible in the report, unlike a silent pass.
test.skip(
  !hasClerkCredentials(),
  "Set CLERK_SECRET_KEY and VITE_CLERK_PUBLISHABLE_KEY — see README.md.",
);

const email = makeTestEmail();

// One browser context for the whole file. The default `page` fixture builds a
// fresh context per test, which would discard the Clerk session between them —
// but these scenarios are deliberately dependent: signing out and signing back
// in only mean anything against the session the register test established.
let context: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  // Bypasses Clerk's bot protection, which otherwise rejects headless sign-ups.
  await setupClerkTestingToken({ context });
  page = await context.newPage();
});

test.afterAll(async () => {
  await context?.close();
  // Deleted from Postgres *and* Clerk: provisioning is just-in-time (ADR 0009),
  // so removing the Clerk account alone would strand the local row and the ~156
  // exercises seeded under it.
  await deleteTestUser(email);
});

async function submitCredentials(emailValue: string, password: string) {
  // Proof the client is live before we click. The button is disabled until Clerk
  // loads, which can only happen after hydration — so waiting for it to enable
  // rules out clicking a server-rendered form with no React handler behind it,
  // which submits natively and reloads the page with the credentials in the URL.
  // Playwright's own actionability check isn't enough: it would be satisfied by
  // whatever the SSR markup says. Failing here names the cause; failing later on
  // a URL assertion just looks like a 30s timeout.
  await expect(page.getByTestId("submit")).toBeEnabled();

  await page.getByTestId("email").fill(emailValue);
  await page.getByTestId("password").fill(password);
  await page.getByTestId("submit").click();
}

test("redirects a signed-out visitor to sign-in", async () => {
  await page.goto("/plans");

  await expect(page).toHaveURL(/\/sign-in\?.*redirect=/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("registers a new user, provisions them, and seeds their library", async () => {
  await page.goto("/sign-up");
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();

  await submitCredentials(email, TEST_PASSWORD);

  // No verification step: the instance has email verification disabled, so
  // sign-up completes in one hop. The timeout is generous because the first
  // request after sign-up seeds the exercise library inline.
  await expect(page).toHaveURL("/plans", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // A real registrant gets the exercise library only — never the demo plan or
  // the back-dated sessions the dev fixture carries.
  await expect(page.getByText("PPL 6-Week Hypertrophy")).toHaveCount(0);

  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Exercise Library" })).toBeVisible();
  await expect(page.getByText("Bench Press").first()).toBeVisible();

  const rows = await findLocalUsers(email);
  expect(rows).toHaveLength(1);
  expect(rows[0]?.clerk_user_id).toMatch(/^user_/);
  expect(Number(rows[0]?.exercise_count)).toBeGreaterThan(100);
});

test("signs out and clears the session", async () => {
  await page.goto("/plans");
  await page.getByTestId("log-out").click();

  await expect(page).toHaveURL(/\/sign-in/);

  // Prove the session is gone rather than merely navigated away from.
  await page.goto("/plans");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("signs back in and resolves the same account without re-seeding", async () => {
  await page.goto("/sign-in");
  await submitCredentials(email, TEST_PASSWORD);

  await expect(page).toHaveURL("/plans");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/library");
  await expect(page.getByText("Bench Press").first()).toBeVisible();

  // The ON CONFLICT guard in provisioning means signing in resolved the existing
  // user rather than creating and seeding a second one.
  await expect(findLocalUsers(email)).resolves.toHaveLength(1);
});

test("rejects a wrong password with a visible error", async () => {
  // The previous test left an active session; Clerk's sign-in behaves
  // differently when one exists, so start genuinely signed out.
  await page.goto("/plans");
  await page.getByTestId("log-out").click();
  await expect(page).toHaveURL(/\/sign-in/);

  await submitCredentials(email, "definitely-not-the-password");

  await expect(page.getByTestId("auth-error")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});
