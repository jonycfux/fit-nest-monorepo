# Exercise variants: detached clone that records a `variantOf` breadcrumb, no family behavior

A **variant** is a Template Exercise created by cloning another (its **source**). The clone is a fully **independent** Template — no shared state — but it stamps a nullable, immutable **`variantOf`** pointer to its **immediate** source at creation time. That pointer carries **no behavior today**: nothing reads it, there is no shared history, no grouping, and no cascade. It exists solely as a lineage breadcrumb so that "exercise families" (grouped progress, family-aware backup suggestions) remain a purely additive feature later.

We chose this middle path over the two obvious ends because the link is the one thing that is **not backfillable**: a plain detached clone (no link) would make it impossible to ever reconstruct which existing Templates were variants of which — the same trap as the adherence snapshot in ADR 0001 — while building full family behavior now is unwarranted speculation. Recording a single nullable self-FK is nearly free insurance.

## Considered Options

- **Detached clone, no link:** simplest, but loses the parent relationship permanently and non-recoverably. Rejected.
- **Full variant families now** (grouping, rolled-up progress, cascade): speculative feature-building ahead of demand; against the project's low-friction, defer-behavior ethos. Rejected.
- **Record the breadcrumb, build nothing** (chosen): capture `variantOf`, attach no behavior.

## What cloning copies

Pre-filled from the source (all editable before save): movement pattern, target muscles, equipment, attachment, and a **value-copy** of the source's Backup Exercises (independent rows, not live-linked). **Not** copied: the source's Note (starts blank) and the name (must be changed). `variantOf` is set to the immediate source.

## Consequences

- `variantOf` points at the **immediate** source, not the ultimate root — strictly more information (the root is derivable by walking up; intermediate lineage is not recoverable from a root-only link). Variants form a cycle-free forest (≤1 parent, many children).
- **No cascade:** archiving or editing a source never touches its variants. `variantOf` points at the (soft-deleted) source row, which persists; only a true hard-delete of a source would `SET NULL`.
- A future contributor will see a `variantOf` column that **no feature reads** — this is deliberate, not dead code. Do not remove it; it is non-backfillable breadcrumb data.
- Distinct from **Backup Exercises** (ADR-less, in CONTEXT): variants are a *lineage* record; backups are a *substitution* record. They often overlap (a variant is a good backup) but are modeled separately. User-defined **backup collections** are a related future extension the backup model stays additive-compatible with.
