import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fitnessPlans = pgTable("fitness_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  durationWeeks: integer("duration_weeks").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// drizzle-zod derives Zod schemas from the table definitions — the single
// source of truth shared between the DB layer and tRPC input validation.
export const insertFitnessPlanSchema = createInsertSchema(fitnessPlans);
export const selectFitnessPlanSchema = createSelectSchema(fitnessPlans);
