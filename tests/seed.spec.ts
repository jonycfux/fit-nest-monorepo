import { expect, test } from "@playwright/test";

// Verifies data produced by packages/api/src/db/seed.ts renders correctly in
// the web-app. Requires: Postgres migrated + seeded, API running with
// DEV_AUTH_BYPASS=true (see README for setup steps).
//
// The seeded exercise library is a ~260-exercise curated subset of
// free-exercise-db (see packages/api/scripts/build-exercise-seed-data.ts), so
// these checks only assert on the handful of exercises the seeded plan's
// workouts actually reference, not the full library.

const MUSCLE_GROUPS = [
  "chest",
  "triceps",
  "delts",
  "quads",
  "glutes",
  "hamstrings",
  "back",
  "biceps",
  "core",
];

const EXERCISE_NAMES = [
  "Barbell Bench Press - Medium Grip",
  "Barbell Shoulder Press",
  "Barbell Squat",
  "Barbell Deadlift",
  "Romanian Deadlift",
  "Bent Over Barbell Row",
  "Pullups",
  "Wide-Grip Lat Pulldown",
  "Barbell Walking Lunge",
  "Plank",
];

test.describe("Dashboard (/plans)", () => {
  test("shows the seeded plan and set-volume data", async ({ page }) => {
    await page.goto("/plans");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    const planLink = page.getByRole("link", { name: /PPL 6-Week Hypertrophy/ });
    await expect(planLink).toBeVisible();
    await expect(planLink).toContainText("6 weeks · 3 workouts");

    for (const group of MUSCLE_GROUPS) {
      await expect(page.getByText(group, { exact: true })).toBeVisible();
    }

    await page.getByRole("combobox").selectOption("monthly");
    await expect(page.getByText("chest", { exact: true })).toBeVisible();
  });
});

test.describe("Plan Builder (/plans/$planId)", () => {
  test("shows plan name, exercise library, and each seeded workout", async ({ page }) => {
    await page.goto("/plans");
    await page.getByRole("link", { name: /PPL 6-Week Hypertrophy/ }).click();
    await expect(page).toHaveURL(/\/plans\/.+/);

    await expect(page.getByText("Active plan: PPL 6-Week Hypertrophy")).toBeVisible();

    for (const name of EXERCISE_NAMES) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }

    const workoutSelect = page.getByRole("combobox");
    await expect(workoutSelect.locator("option", { hasText: "Push Day A" })).toHaveCount(1);
    await expect(workoutSelect.locator("option", { hasText: "Pull Day A" })).toHaveCount(1);
    await expect(workoutSelect.locator("option", { hasText: "Leg Day A" })).toHaveCount(1);

    const workoutExerciseCounts: Record<string, number> = {
      "Push Day A": 2,
      "Pull Day A": 3,
      "Leg Day A": 3,
    };

    for (const [workoutName, exerciseCount] of Object.entries(workoutExerciseCounts)) {
      await workoutSelect.selectOption({ label: workoutName });
      await expect(page.getByText(`${workoutName} · ${exerciseCount} exercises`)).toBeVisible();
    }
  });
});

test.describe("Exercise Library (/library)", () => {
  test("lists seeded template exercises", async ({ page }) => {
    await page.goto("/library");

    await expect(page.getByRole("heading", { name: "Exercise Library" })).toBeVisible();

    for (const name of EXERCISE_NAMES) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    // Library cards render primary muscles only (secondary muscles show on the detail page).
    // The link's accessible name includes trailing badge text, so anchor on the exercise
    // name as a prefix rather than an exact match.
    const benchPressCard = page.getByRole("link", { name: /^Barbell Bench Press - Medium Grip\b/ });
    await expect(benchPressCard.getByText("push")).toBeVisible();
    await expect(benchPressCard.getByText("chest")).toBeVisible();
    await expect(benchPressCard.getByText("barbell", { exact: true })).toBeVisible();
  });
});

test.describe("Exercise detail (/library/$exerciseId)", () => {
  test("shows backup exercises seeded for Barbell Bench Press", async ({ page }) => {
    await page.goto("/library");
    await page.getByRole("link", { name: /^Barbell Bench Press - Medium Grip\b/ }).click();

    await expect(
      page.getByRole("heading", { name: "Barbell Bench Press - Medium Grip" }),
    ).toBeVisible();
    await expect(page.getByText("1 backups")).toBeVisible();
    await expect(page.getByText("Barbell Shoulder Press")).toBeVisible();
  });

  test("shows backup exercises seeded for Pullups", async ({ page }) => {
    await page.goto("/library");
    await page.getByRole("link", { name: /^Pullups\b/ }).click();

    await expect(page.getByRole("heading", { name: "Pullups" })).toBeVisible();
    await expect(page.getByText("1 backups")).toBeVisible();
    await expect(page.getByText("Wide-Grip Lat Pulldown")).toBeVisible();
  });
});
