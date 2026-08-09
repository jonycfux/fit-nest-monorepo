import { expect, test } from "@playwright/test";
import { SEED_EXERCISES } from "../packages/api/src/db/seed-data/exercises.js";
import {
  SEED_BACKUP_LINKS,
  SEED_PLAN,
  SEED_WORKOUTS,
} from "../packages/api/src/db/seed-data/plan.js";
import type { SeedExercise } from "../packages/api/src/db/seed-data/types.js";

// Verifies data produced by packages/api/src/db/seed.ts renders correctly in
// the web-app. Requires: Postgres migrated + seeded, API running with
// DEV_AUTH_BYPASS=true (see README for setup steps).
//
// Everything asserted here is derived from the seed definitions themselves, so
// changing the seeded exercises/workouts doesn't require editing this file.

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

// The seeded library is large, so only assert on the exercises the seeded plan's
// workouts (and backup links) actually reference.
const EXERCISE_NAMES = [
  ...new Set([
    ...SEED_WORKOUTS.flatMap((w) => w.prescriptions.map((p) => p.exercise)),
    ...SEED_BACKUP_LINKS.flatMap((l) => [l.exercise, l.backup]),
  ]),
];

const PLAN_META = `${SEED_PLAN.durationWeeks} weeks · ${SEED_WORKOUTS.length} workouts`;

function exerciseByName(name: string): SeedExercise {
  const exercise = SEED_EXERCISES.find((e) => e.name === name);
  if (!exercise) throw new Error(`Seed exercise not found: ${name}`);
  return exercise;
}

// Card/link accessible names concatenate the exercise name with its badge text,
// so anchor on the name as a prefix rather than matching it exactly.
function cardLocatorName(name: string): RegExp {
  return new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}\\b`);
}

test.describe("Dashboard (/plans)", () => {
  test("shows the seeded plan and set-volume data", async ({ page }) => {
    await page.goto("/plans");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    const planLink = page.getByRole("link", { name: new RegExp(SEED_PLAN.name) });
    await expect(planLink).toBeVisible();
    await expect(planLink).toContainText(PLAN_META);

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
    await page.getByRole("link", { name: new RegExp(SEED_PLAN.name) }).click();
    await expect(page).toHaveURL(/\/plans\/.+/);

    await expect(page.getByText(`Active plan: ${SEED_PLAN.name}`)).toBeVisible();

    for (const name of EXERCISE_NAMES) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }

    const workoutSelect = page.getByRole("combobox");
    for (const workout of SEED_WORKOUTS) {
      await expect(workoutSelect.locator("option", { hasText: workout.name })).toHaveCount(1);
    }

    for (const workout of SEED_WORKOUTS) {
      await workoutSelect.selectOption({ label: workout.name });
      await expect(
        page.getByText(`${workout.name} · ${workout.prescriptions.length} exercises`),
      ).toBeVisible();
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
    const sample = exerciseByName(EXERCISE_NAMES[0] as string);
    const card = page.getByRole("link", { name: cardLocatorName(sample.name) });
    await expect(card.getByText(sample.movementPattern, { exact: true })).toBeVisible();
    for (const muscle of sample.muscles.filter((m) => m.role === "primary")) {
      await expect(card.getByText(muscle.muscleGroup, { exact: true })).toBeVisible();
    }
    if (sample.equipment) {
      await expect(card.getByText(sample.equipment, { exact: true })).toBeVisible();
    }
  });
});

test.describe("Exercise detail (/library/$exerciseId)", () => {
  for (const link of SEED_BACKUP_LINKS) {
    test(`shows backup exercises seeded for ${link.exercise}`, async ({ page }) => {
      await page.goto("/library");
      await page.getByRole("link", { name: cardLocatorName(link.exercise) }).click();

      await expect(page.getByRole("heading", { name: link.exercise })).toBeVisible();

      const backupCount = SEED_BACKUP_LINKS.filter((l) => l.exercise === link.exercise).length;
      await expect(page.getByText(`${backupCount} backups`)).toBeVisible();
      await expect(page.getByText(link.backup)).toBeVisible();
    });
  }
});
