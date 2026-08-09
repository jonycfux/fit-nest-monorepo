import type { SeedBackupLink, SeedPlan, SeedSession, SeedWorkout } from "./types.js";

export const SEED_PLAN: SeedPlan = { name: "PPL 6-Week Hypertrophy", durationWeeks: 6 };

// A couple of backup links, just so Exercise Detail has something to show.
export const SEED_BACKUP_LINKS: SeedBackupLink[] = [
  { exercise: "Bench Press", backup: "Shoulder Press" },
  { exercise: "Pullups", backup: "Lat Pulldown" },
];

export const SEED_WORKOUTS: SeedWorkout[] = [
  {
    name: "Push Day A",
    prescriptions: [
      {
        exercise: "Bench Press",
        sets: [
          { reps: 8, load: 60 },
          { reps: 8, load: 60 },
          { reps: 8, load: 65 },
          { reps: 6, load: 65 },
        ],
      },
      {
        exercise: "Shoulder Press",
        sets: [
          { reps: 10, load: 35 },
          { reps: 10, load: 35 },
          { reps: 8, load: 37.5 },
        ],
      },
    ],
  },
  {
    name: "Pull Day A",
    prescriptions: [
      {
        exercise: "Bent Over Row",
        sets: [
          { reps: 8, load: 55 },
          { reps: 8, load: 55 },
          { reps: 8, load: 60 },
          { reps: 6, load: 60 },
        ],
      },
      { exercise: "Pullups", sets: [{ reps: 8 }, { reps: 8 }, { reps: 6 }] },
      {
        exercise: "Lat Pulldown",
        sets: [
          { reps: 10, load: 45 },
          { reps: 10, load: 45 },
          { reps: 10, load: 45 },
        ],
      },
    ],
  },
  {
    name: "Leg Day A",
    prescriptions: [
      {
        exercise: "Squat",
        sets: [
          { reps: 6, load: 80 },
          { reps: 6, load: 80 },
          { reps: 6, load: 85 },
          { reps: 5, load: 85 },
        ],
      },
      {
        exercise: "Romanian Deadlift",
        sets: [
          { reps: 10, load: 60 },
          { reps: 10, load: 60 },
          { reps: 10, load: 65 },
        ],
      },
      {
        exercise: "Walking Lunge",
        sets: [
          { reps: 10, load: 20 },
          { reps: 10, load: 20 },
          { reps: 10, load: 20 },
        ],
      },
    ],
  },
];

// Logged history: this week (partial, for a realistic mixed-progress volume
// panel) + last week (full) + three weeks ago (for the monthly view).
export const SEED_SESSIONS: SeedSession[] = [
  { workout: "Push Day A", daysAgo: 1 },
  { workout: "Pull Day A", daysAgo: 3 },
  { workout: "Leg Day A", daysAgo: 9 },
  { workout: "Push Day A", daysAgo: 10 },
  { workout: "Pull Day A", daysAgo: 12 },
  { workout: "Leg Day A", daysAgo: 23 },
];
