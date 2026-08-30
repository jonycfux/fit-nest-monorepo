import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Clerk keys and DATABASE_URL live in the per-package env files. The auth suite
// needs them in the Playwright process itself (to mint testing tokens and to
// clean up the accounts it creates), not just in the servers it boots.
dotenv.config({ path: path.resolve(__dirname, "packages/api/.env"), quiet: true });
dotenv.config({ path: path.resolve(__dirname, "packages/web-app/.env"), quiet: true });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Mints the Clerk testing token the auth suite needs. No-ops when the auth
   * project isn't selected, so seed-only runs need no Clerk credentials. */
  globalSetup: "./tests/support/clerk-global-setup.ts",
  /* Per-test budget. The seed checks are fast renders, but the auth suite talks
   * to Clerk and pays for the just-in-time seed of a ~156-exercise library on
   * the first request after sign-up, so it gets a much longer budget below. */
  timeout: 8_000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  projects: [
    /* Seed rendering checks. These run as the fixed dev user, opted in via the
     * dev cookie in the storage state below — the API grants it only because
     * the server runs with DEV_AUTH_BYPASS. Browser coverage lives here because
     * these are the pure-rendering assertions. */
    ...["chromium", "firefox", "webkit"].map((browser) => ({
      name: `seed-${browser}`,
      testMatch: /seed\.spec\.ts/,
      use: {
        ...devices[
          browser === "chromium"
            ? "Desktop Chrome"
            : browser === "firefox"
              ? "Desktop Firefox"
              : "Desktop Safari"
        ],
        storageState: "tests/.auth/dev-user.json",
      },
    })),

    /* Real Clerk register/login flow. No dev cookie, so these exercise genuine
     * sign-up, session creation, and just-in-time provisioning. Chromium only:
     * each run creates and deletes a real Clerk account, so running it three
     * times over adds cost and flake without testing anything browser-specific.
     * Serial, because the login test signs in as the account the register test
     * creates. */
    {
      name: "auth",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      timeout: 60_000,
    },
  ],

  /* Boot both servers from their compiled output — the same artifacts a deploy
   * ships (`node dist/server.js` for the API, the Nitro build for the web app),
   * so the suite exercises what actually ships rather than Vite's dev server
   * and its on-demand transforms, HMR client, and devtools.
   *
   * Both `start` scripts read the package's own .env; the vars below take
   * precedence, since Node's --env-file never overwrites an inherited variable.
   *
   * DEV_AUTH_BYPASS grants the *capability* to resolve to the seeded dev user;
   * a request only claims it by carrying the dev cookie/header, so the auth
   * suite still sees a genuinely signed-out visitor on the same server
   * (ADR 0009). The DB it points at must already be migrated and seeded.
   *
   * These serve a build, not the working tree, so run `npm run test:e2e` (which
   * builds first) rather than `npx playwright test` on its own. No existing
   * server is reused: a dev server you happened to leave on the port would
   * defeat the point of testing the build. */
  webServer: [
    {
      command: "npm start -w @fitnest/api",
      url: "http://localhost:4000/",
      reuseExistingServer: false,
      env: { DEV_AUTH_BYPASS: "true", PORT: "4000" },
    },
    {
      command: "npm start -w @fitnest/web-app",
      url: "http://localhost:3000",
      reuseExistingServer: false,
      env: { DEV_AUTH_BYPASS: "true", PORT: "3000" },
    },
  ],
});
