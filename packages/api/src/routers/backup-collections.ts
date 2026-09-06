import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { backupCollections, backupExercises, prescribedExercises } from "../db/schema.js";
import { protectedProcedure, router } from "../trpc.js";
import {
  assertOwnedCollection,
  assertOwnedExercises,
  defaultCollectionId,
  firstOrThrow,
  rethrowAsConflict,
} from "./_shared.js";
import { replaceCollectionBackups } from "./template-exercises.js";

const NAME_TAKEN = "That exercise already has a collection with that name.";

const collectionIdInput = z.object({ collectionId: z.string().uuid() });

// ADR 0011: named, ordered groups of one Template Exercise's backups. A user who
// never creates one only ever touches the unnamed default collection, which the
// templateExercises router materialises for them.
export const backupCollectionsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        templateExerciseId: z.string().uuid(),
        name: z.string().min(1),
        backupExerciseIds: z.array(z.string().uuid()).default([]),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        // Reuses the exercise-ownership check: a collection may only hang off
        // one of the caller's own Template Exercises (ADR 0002).
        await assertOwnedExercises(tx, ctx.user.id, [input.templateExerciseId]);

        const next = firstOrThrow(
          await tx
            .select({ position: sql<number>`coalesce(max(${backupCollections.position}), -1) + 1` })
            .from(backupCollections)
            .where(eq(backupCollections.templateExerciseId, input.templateExerciseId)),
        ).position;

        const collection = firstOrThrow(
          await tx
            .insert(backupCollections)
            .values({
              templateExerciseId: input.templateExerciseId,
              name: input.name,
              position: next,
            })
            .returning()
            .catch((e) => rethrowAsConflict(e, NAME_TAKEN)),
        );
        await replaceCollectionBackups(tx, ctx.user.id, collection.id, input.backupExerciseIds);
        return collection;
      }),
    ),

  rename: protectedProcedure
    .input(collectionIdInput.extend({ name: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        await assertOwnedCollection(tx, ctx.user.id, input.collectionId);
        // The default collection is unnamed *by definition* — naming it would
        // leave the exercise with no default and orphan every slot that falls
        // back to it. Create a named collection instead.
        const [collection] = await tx
          .update(backupCollections)
          .set({ name: input.name })
          .where(
            and(
              eq(backupCollections.id, input.collectionId),
              sql`${backupCollections.name} is not null`,
            ),
          )
          .returning()
          .catch((e) => rethrowAsConflict(e, NAME_TAKEN));
        if (!collection) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The default collection cannot be named.",
          });
        }
        return collection;
      }),
    ),

  setBackups: protectedProcedure
    .input(collectionIdInput.extend({ backupExerciseIds: z.array(z.string().uuid()) }))
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        await assertOwnedCollection(tx, ctx.user.id, input.collectionId);
        await replaceCollectionBackups(
          tx,
          ctx.user.id,
          input.collectionId,
          input.backupExerciseIds,
        );
        return { collectionId: input.collectionId };
      }),
    ),

  delete: protectedProcedure.input(collectionIdInput).mutation(({ ctx, input }) =>
    ctx.db.transaction(async (tx) => {
      await assertOwnedCollection(tx, ctx.user.id, input.collectionId);

      const [collection] = await tx
        .select({ name: backupCollections.name })
        .from(backupCollections)
        .where(eq(backupCollections.id, input.collectionId));
      if (collection?.name === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The default collection cannot be deleted; clear its backups instead.",
        });
      }

      // The composite FK from prescribed_exercises carries no ON DELETE action
      // (SET NULL would try to null the NOT NULL template_exercise_id alongside
      // it), so slots pointing here are released first, in the same transaction.
      // They fall back to the Template's default collection.
      await tx
        .update(prescribedExercises)
        .set({ backupCollectionId: null })
        .where(eq(prescribedExercises.backupCollectionId, input.collectionId));

      await tx.delete(backupCollections).where(eq(backupCollections.id, input.collectionId));
      return { collectionId: input.collectionId };
    }),
  ),

  // Display order of an exercise's collections. Any collection omitted from the
  // list keeps its position behind the ones named here.
  reorder: protectedProcedure
    .input(
      z.object({
        templateExerciseId: z.string().uuid(),
        collectionIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        await assertOwnedExercises(tx, ctx.user.id, [input.templateExerciseId]);
        if (input.collectionIds.length === 0) return { ok: true };

        const owned = await tx
          .select({ id: backupCollections.id })
          .from(backupCollections)
          .where(
            and(
              eq(backupCollections.templateExerciseId, input.templateExerciseId),
              inArray(backupCollections.id, input.collectionIds),
            ),
          );
        if (owned.length !== input.collectionIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Collection does not belong to that Template Exercise.",
          });
        }

        for (const [position, id] of input.collectionIds.entries()) {
          await tx.update(backupCollections).set({ position }).where(eq(backupCollections.id, id));
        }
        return { ok: true };
      }),
    ),

  // The backups a given Prescribed Exercise slot should offer: its chosen
  // collection, or the Template's default when it has not chosen one (ADR 0011).
  forPrescribedExercise: protectedProcedure
    .input(z.object({ prescribedExerciseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [slot] = await ctx.db
        .select({
          templateExerciseId: prescribedExercises.templateExerciseId,
          backupCollectionId: prescribedExercises.backupCollectionId,
        })
        .from(prescribedExercises)
        .where(eq(prescribedExercises.id, input.prescribedExerciseId));
      if (!slot) throw new TRPCError({ code: "NOT_FOUND" });
      // assertOwnedExercises wants a transaction handle; a bare read is fine in
      // its own single-statement transaction.
      await ctx.db.transaction((tx) =>
        assertOwnedExercises(tx, ctx.user.id, [slot.templateExerciseId]),
      );

      const [collection] = slot.backupCollectionId
        ? await ctx.db
            .select()
            .from(backupCollections)
            .where(eq(backupCollections.id, slot.backupCollectionId))
        : await ctx.db
            .select()
            .from(backupCollections)
            .where(
              and(
                eq(backupCollections.templateExerciseId, slot.templateExerciseId),
                isNull(backupCollections.name),
              ),
            );
      if (!collection) return { collection: null, backups: [] };

      const backups = await ctx.db
        .select({
          backupExerciseId: backupExercises.backupExerciseId,
          position: backupExercises.position,
        })
        .from(backupExercises)
        .where(eq(backupExercises.collectionId, collection.id))
        .orderBy(backupExercises.position);

      return { collection, backups };
    }),

  // Escape hatch for callers that want the default collection's id up front
  // (e.g. an editor that adds to it before the exercise has any backups).
  ensureDefault: protectedProcedure
    .input(z.object({ templateExerciseId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        await assertOwnedExercises(tx, ctx.user.id, [input.templateExerciseId]);
        return { collectionId: await defaultCollectionId(tx, input.templateExerciseId) };
      }),
    ),
});
