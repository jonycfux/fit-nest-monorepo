# Backup Collections are the list, and a slot selects one

Backups stop being a flat list per Template Exercise and become **Backup Collections**: named, ordered groups owned by one Template Exercise, with an unnamed **default collection** standing in for today's list. A Prescribed Exercise gets slot-specific backups by **selecting** one of its Template's collections, never by owning backups of its own. This closes the parking-lot item CONTEXT.md carried since 2026-07-05 and the "slot-specific backups deferred/additive" line in [ADR 0003](0003-exercise-attributes-live-at-their-owning-level.md).

## Collections are per-exercise, not a user-wide vocabulary

A collection belongs to exactly one Template Exercise. Bench Press's "home gym" and Squat's "home gym" are unrelated rows that happen to share a spelling; renaming one does not touch the other, and there is no query for "my whole home-gym fallback plan."

The alternative — a user-owned **context** ("home gym" exists once in the library, and backup links are tagged with it) — is the model that scales to a user with 150 exercises: no retyping, no `home gym`/`Home Gym` drift, and cross-exercise filtering falls out for free. It was rejected for now because it invents a second owned entity and a picker UI to serve a feature nobody has used yet, and because the per-exercise version is what the domain model already committed to in writing. If users start creating the same collection name on many exercises, that is the signal to promote it; the migration would be to add `backup_contexts(id, user_id, name)` and point collections at one, which is additive.

## The parking-lot sketch could not have worked

The note said this was a nullable `collectionId` on the existing link row. That table's primary key is `(template_exercise_id, backup_exercise_id)`, so one backup can appear on an exercise exactly once — and Dumbbell Bench Press belongs in Bench Press's "home gym" *and* its "commercial gym". A nullable column would have quietly shipped a model where collections partition the backups, and the partition is wrong: most backups are valid in more than one situation, which is the whole reason to group them.

Keeping the nullable column and multi-membership together would have meant a surrogate PK plus a `NULLS NOT DISTINCT` unique index to stop `(te, NULL, backup)` being insertable twice — the sort of subtlety that is one forgotten clause away from silent duplicates.

So the NULL is gone instead: **the collection is the list**. Every link row has a `collection_id`, `position` is scoped per collection, and an exercise's pre-existing flat list migrates into a single collection whose `name` is null. Null-name means *the default*, enforced by a partial unique index (`WHERE name IS NULL`), because Postgres treats NULLs as distinct and would otherwise allow an exercise two defaults. Users who never create a collection see and touch nothing new: the API still exposes a plain `backups` array, which is that default collection's members.

## A slot selects a collection; it never owns backups

`prescribed_exercises.backup_collection_id` is nullable and means "offer this collection at this slot"; null means the Template's default. The rejected alternative was a `prescribed_exercise_backups` link table letting a slot name backups the Template never listed. That is more expressive and it is exactly the copy-down [ADR 0003](0003-exercise-attributes-live-at-their-owning-level.md) exists to reject: the same list rebuilt at a lower level, so editing the Template's backups leaves the slot holding a stale set. Selection keeps the fact at its owning level and propagates edits for free.

The constraint is a **composite foreign key** on `(template_exercise_id, backup_collection_id)` against `backup_collections (template_exercise_id, id)`, which needs a `UNIQUE(template_exercise_id, id)` on the parent to have something to reference. It makes pointing a slot at *another* exercise's collection impossible in the database rather than in a validation branch — so a stale id surviving a template swap in the Plan Builder fails loudly. `MATCH SIMPLE` (the default) does not enforce the constraint while `backup_collection_id` is null, which is precisely the fallback case, so the nullable half needs no special handling.

## Consequences

- **The FK carries no `ON DELETE` action.** `SET NULL` would try to null the `NOT NULL` `template_exercise_id` alongside the collection id; the column-list form (`ON DELETE SET NULL (backup_collection_id)`) is PG15+ and not expressible through drizzle. Deleting a collection therefore *errors* while a slot still points at it, and `backupCollections.delete` releases those slots in the same transaction first. A future direct `DELETE` that skips the router will fail loudly rather than corrupt anything.
- **Migration is expand-then-contract, in two files.** `0002` adds `backup_collections` and a nullable `collection_id`; `0003` backfills one null-named collection per exercise that has backups, repoints the links, then drops `template_exercise_id` and moves the primary key. Doing it in one file would have made drizzle-kit ask whether the added and dropped columns were a rename, and there is no correct answer — the values are not the same thing.
- **The default collection is materialised lazily.** An exercise with no backups has no collection row at all; the first `setBackups` creates one. The seed follows the same rule, so a new user gets two collection rows (Bench Press, Pullups), not 156.
- **A variant clone copies the grouping too**, names included ([ADR 0004](0004-exercise-variants-detached-clone-with-breadcrumb.md) already copied the backups by value). A clone that kept the backups but flattened the "home gym"/"commercial gym" split would hand the user a re-organisation chore.
- **The default collection cannot be renamed or deleted** through the API. Naming it would leave the exercise with no default and orphan every slot falling back to it; deleting it is spelled "set its backups to empty".

## Template Exercise names are now unique per user

Bundled here because it shares the migration and the same reasoning about identity: `UNIQUE (user_id, lower(btrim(name))) WHERE archived_at IS NULL`. A name is the library's only human-facing identifier — the Plan Builder picker, the backup picker, the volume panel and every badge render it and nothing else — so two active Templates spelling it the same way are indistinguishable everywhere it matters.

The predicate is the part worth recording. A plain unique index would let an Archived Template squat on its name forever, and archiving is a *soft delete* (ADR 0001) with no archive-management screen to rename it from; a user who archives "Bench Press" must be able to author a new one. So archived rows are excluded, and archiving releases the name.

`create`, `update` and `createVariant` map the resulting `23505` to a tRPC `CONFLICT` rather than a 500, because this is a reachable user action, not a fault: [ADR 0010](0010-execution-attributes-with-advisory-naming.md)'s `suggestName` can land on a name the user already has, and the clone form has to say so inline.

**What this does not fix:** near-duplicates. `Deadlift` and `Deadlifts` are different strings and the index is happy with both. That was a seed-data problem and got a seed-data fix — and on inspection those nine pairs were never duplicates at all, but the same movement with a different implement (barbell vs. cable), pluralised to dodge a name collision when equipment was stripped out of the seed names. Since a different implement is a different Template Exercise (ADR 0003), both members of each pair now carry their equipment as a prefix: `Barbell Deadlift` / `Cable Deadlift`. All 156 entries were kept.
