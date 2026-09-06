import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  backupCollections,
  backupExercises,
  equipment,
  movementPattern,
  muscleGroup,
  muscleRole,
  templateExerciseMuscles,
  templateExercises,
} from "../db/schema.js";
import { protectedProcedure, router } from "../trpc.js";
import {
  assertOwnedExercises,
  defaultCollectionId,
  firstOrThrow,
  rethrowAsConflict,
  type Tx,
} from "./_shared.js";

const NAME_TAKEN = "You already have an exercise with that name.";

// Inputs are hand-written in the root zod (not derived via drizzle-zod): the
// installed drizzle-zod brands its schemas against a different zod minor, so
// composing them (z.array/.extend) breaks inference. Enum *values* still come
// from the pgEnums, so the DB stays the source of truth for the vocabularies.
const baseFields = z.object({
  name: z.string().min(1),
  movementPattern: z.enum(movementPattern.enumValues),
  equipment: z.enum(equipment.enumValues).nullish(),
  attachment: z.string().nullish(),
  note: z.string().nullish(),
});

const muscleInput = z.object({
  muscleGroup: z.enum(muscleGroup.enumValues),
  role: z.enum(muscleRole.enumValues),
});

// ADR 0003: at least one primary target muscle (enforced at the app level).
const muscleArray = z
  .array(muscleInput)
  .min(1)
  .refine((m) => m.some((x) => x.role === "primary"), {
    message: "At least one primary target muscle is required.",
  });

const idInput = z.object({ id: z.string().uuid() });

// Replace a Template Exercise's muscle rows in place.
async function replaceMuscles(
  tx: Tx,
  templateExerciseId: string,
  muscles: z.infer<typeof muscleArray>,
) {
  await tx
    .delete(templateExerciseMuscles)
    .where(eq(templateExerciseMuscles.templateExerciseId, templateExerciseId));
  await tx
    .insert(templateExerciseMuscles)
    .values(muscles.map((m) => ({ ...m, templateExerciseId })));
}

// Replace one collection's ordered backup list in place.
export async function replaceCollectionBackups(
  tx: Tx,
  userId: string,
  collectionId: string,
  backupExerciseIds: string[],
) {
  await tx.delete(backupExercises).where(eq(backupExercises.collectionId, collectionId));
  if (backupExerciseIds.length === 0) return;
  await assertOwnedExercises(tx, userId, backupExerciseIds);
  await tx.insert(backupExercises).values(
    backupExerciseIds.map((backupExerciseId, position) => ({
      collectionId,
      backupExerciseId,
      position,
    })),
  );
}

// Replace a Template Exercise's *default* collection (ADR 0011). This is the
// collection-unaware path every existing caller uses; naming collections is
// opt-in through the backupCollections router.
async function replaceBackups(
  tx: Tx,
  userId: string,
  templateExerciseId: string,
  backupExerciseIds: string[],
) {
  const collectionId = await defaultCollectionId(tx, templateExerciseId);
  await replaceCollectionBackups(tx, userId, collectionId, backupExerciseIds);
}

export const templateExercisesRouter = router({
  // The user's active library (Archived excluded — ADR 0001). Includes primary
  // muscles (batch-fetched, not per-row) for the Library grid's badge row.
  list: protectedProcedure.query(async ({ ctx }) => {
    const exercises = await ctx.db
      .select()
      .from(templateExercises)
      .where(and(eq(templateExercises.userId, ctx.user.id), isNull(templateExercises.archivedAt)))
      .orderBy(templateExercises.name);

    const ids = exercises.map((e) => e.id);
    const primaryMuscleRows = ids.length
      ? await ctx.db
          .select({
            templateExerciseId: templateExerciseMuscles.templateExerciseId,
            muscleGroup: templateExerciseMuscles.muscleGroup,
          })
          .from(templateExerciseMuscles)
          .where(
            and(
              inArray(templateExerciseMuscles.templateExerciseId, ids),
              eq(templateExerciseMuscles.role, "primary"),
            ),
          )
      : [];

    const primaryMusclesByExercise = new Map<string, string[]>();
    for (const row of primaryMuscleRows) {
      const list = primaryMusclesByExercise.get(row.templateExerciseId) ?? [];
      list.push(row.muscleGroup);
      primaryMusclesByExercise.set(row.templateExerciseId, list);
    }

    return exercises.map((exercise) => ({
      ...exercise,
      primaryMuscles: primaryMusclesByExercise.get(exercise.id) ?? [],
    }));
  }),

  byId: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
    const [exercise] = await ctx.db
      .select()
      .from(templateExercises)
      .where(and(eq(templateExercises.id, input.id), eq(templateExercises.userId, ctx.user.id)));
    if (!exercise) throw new TRPCError({ code: "NOT_FOUND" });

    const muscles = await ctx.db
      .select({
        muscleGroup: templateExerciseMuscles.muscleGroup,
        role: templateExerciseMuscles.role,
      })
      .from(templateExerciseMuscles)
      .where(eq(templateExerciseMuscles.templateExerciseId, exercise.id));

    // Collections in display order, each with its ordered members. The same
    // backup may legitimately appear in more than one collection (ADR 0011).
    const collectionRows = await ctx.db
      .select()
      .from(backupCollections)
      .where(eq(backupCollections.templateExerciseId, exercise.id))
      .orderBy(backupCollections.position);

    const memberRows = collectionRows.length
      ? await ctx.db
          .select({
            collectionId: backupExercises.collectionId,
            backupExerciseId: backupExercises.backupExerciseId,
            position: backupExercises.position,
          })
          .from(backupExercises)
          .where(
            inArray(
              backupExercises.collectionId,
              collectionRows.map((c) => c.id),
            ),
          )
          .orderBy(backupExercises.position)
      : [];

    const collections = collectionRows.map((collection) => ({
      ...collection,
      backups: memberRows
        .filter((m) => m.collectionId === collection.id)
        .map(({ backupExerciseId, position }) => ({ backupExerciseId, position })),
    }));

    // `backups` is the default collection's list, kept as a top-level field so
    // collection-unaware callers (the Exercise Detail panel, the Edit form) need
    // no knowledge of collections until a user creates a second one.
    const backups = collections.find((c) => c.name === null)?.backups ?? [];

    return { ...exercise, muscles, collections, backups };
  }),

  create: protectedProcedure
    .input(
      baseFields.extend({
        muscles: muscleArray,
        backupExerciseIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { muscles, backupExerciseIds, ...fields } = input;
      return ctx.db.transaction(async (tx) => {
        const exercise = firstOrThrow(
          await tx
            .insert(templateExercises)
            .values({ ...fields, userId: ctx.user.id })
            .returning()
            .catch((e) => rethrowAsConflict(e, NAME_TAKEN)),
        );
        await replaceMuscles(tx, exercise.id, muscles);
        if (backupExerciseIds) {
          await replaceBackups(tx, ctx.user.id, exercise.id, backupExerciseIds);
        }
        return exercise;
      });
    }),

  update: protectedProcedure
    .input(
      baseFields.partial().extend({
        id: z.string().uuid(),
        muscles: muscleArray.optional(),
        backupExerciseIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, muscles, backupExerciseIds, ...fields } = input;
      return ctx.db.transaction(async (tx) => {
        // `variantOf` is intentionally not updatable (ADR 0004 — immutable).
        const [exercise] = await tx
          .update(templateExercises)
          .set(fields)
          .where(and(eq(templateExercises.id, id), eq(templateExercises.userId, ctx.user.id)))
          .returning()
          .catch((e) => rethrowAsConflict(e, NAME_TAKEN));
        if (!exercise) throw new TRPCError({ code: "NOT_FOUND" });
        if (muscles) await replaceMuscles(tx, id, muscles);
        if (backupExerciseIds) {
          await replaceBackups(tx, ctx.user.id, id, backupExerciseIds);
        }
        return exercise;
      });
    }),

  // Soft-delete (ADR 0001) — never a hard delete.
  archive: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    const [exercise] = await ctx.db
      .update(templateExercises)
      .set({ archivedAt: new Date() })
      .where(and(eq(templateExercises.id, input.id), eq(templateExercises.userId, ctx.user.id)))
      .returning();
    if (!exercise) throw new TRPCError({ code: "NOT_FOUND" });
    return exercise;
  }),

  // ADR 0004: clone a source into an independent Template. Copies movement
  // pattern, equipment, attachment, muscles, and backups (by value); does NOT
  // copy the note; requires a new name; stamps the immutable `variantOf`.
  createVariant: protectedProcedure
    .input(z.object({ sourceId: z.string().uuid(), name: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        const [source] = await tx
          .select()
          .from(templateExercises)
          .where(
            and(
              eq(templateExercises.id, input.sourceId),
              eq(templateExercises.userId, ctx.user.id),
            ),
          );
        if (!source) throw new TRPCError({ code: "NOT_FOUND" });

        const variant = firstOrThrow(
          await tx
            .insert(templateExercises)
            .values({
              userId: ctx.user.id,
              name: input.name,
              movementPattern: source.movementPattern,
              equipment: source.equipment,
              attachment: source.attachment,
              variantOf: source.id,
            })
            .returning()
            .catch((e) => rethrowAsConflict(e, NAME_TAKEN)),
        );

        const srcMuscles = await tx
          .select({
            muscleGroup: templateExerciseMuscles.muscleGroup,
            role: templateExerciseMuscles.role,
          })
          .from(templateExerciseMuscles)
          .where(eq(templateExerciseMuscles.templateExerciseId, source.id));
        if (srcMuscles.length > 0) {
          await tx
            .insert(templateExerciseMuscles)
            .values(srcMuscles.map((m) => ({ ...m, templateExerciseId: variant.id })));
        }

        // Backups are copied by value (ADR 0004), and now so is the grouping:
        // the variant gets its own collections with the same names and members.
        // Copying the names too is the point — a clone of Bench Press that keeps
        // its backups but loses the "home gym"/"commercial gym" split would hand
        // the user a flat list to re-organise by hand.
        const srcCollections = await tx
          .select()
          .from(backupCollections)
          .where(eq(backupCollections.templateExerciseId, source.id))
          .orderBy(backupCollections.position);

        for (const srcCollection of srcCollections) {
          const members = await tx
            .select({ backupExerciseId: backupExercises.backupExerciseId })
            .from(backupExercises)
            .where(eq(backupExercises.collectionId, srcCollection.id))
            .orderBy(backupExercises.position);
          if (members.length === 0) continue;

          const copy = firstOrThrow(
            await tx
              .insert(backupCollections)
              .values({
                templateExerciseId: variant.id,
                name: srcCollection.name,
                position: srcCollection.position,
              })
              .returning({ id: backupCollections.id }),
          );
          await tx.insert(backupExercises).values(
            members.map((m, position) => ({
              collectionId: copy.id,
              backupExerciseId: m.backupExerciseId,
              position,
            })),
          );
        }

        return variant;
      }),
    ),
});
