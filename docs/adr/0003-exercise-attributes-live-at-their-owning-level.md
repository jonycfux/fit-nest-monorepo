# Exercise attributes live at their owning level, read live — not copied down

A descriptive field on the exercise tables (Template / Prescribed / Logged Exercise) lives **only** on the table that owns the fact, and is redeclared on a lower table **only** when the fact can genuinely *diverge* there and we want to record the divergence. Because Prescribed and Logged Exercises reference the Template Exercise **live** (ADR 0001), a Template-owned attribute is read through that reference and is **never** copied onto the lower tables.

This is the corollary of ADR 0001 (live reference, performed-only, no snapshot) applied to descriptive fields, and it decides every "should this field carry across all three tables?" question. The tempting alternative — copy every attribute onto all three tables "for completeness" — is rejected: it silently rebuilds the prescription snapshot we deliberately dropped and makes edits to a Template stop propagating to history.

## The five fields decided under this rule

| Field | Home(s) | Rationale |
| --- | --- | --- |
| **Movement Pattern** | Template only | Intrinsic; single-value closed enum; can't diverge. |
| **Target Muscles** (primary/secondary) | Template only | Intrinsic; role-tagged link to a global muscle-group enum. |
| **Equipment** | Template only | Intrinsic — a different implement is a different Template. |
| **Attachment** | Template only | *Could* diverge per session, but tracking it fights the low-friction ethos; carry-down deferred (additive). |
| **Note** | Template **and** Prescribed **and** Logged | Different, co-existing facts per level (movement cue / slot intent / session observation) — not a copied-down value. |
| **Backup Exercises** | Template only | Plan-time contingency; self-referential; never on Logged. |

## Consequences

- History reflects **current** Template attribute values (consistent with "renames propagate", ADR 0001) — there is no historical view of a movement's past muscles/equipment.
- Adding per-slot or per-session fidelity later (e.g. actual Attachment used, slot-specific Backups) is **additive** — a nullable override column on the lower table — so deferring costs nothing.
- Global, system-owned enums (muscle groups, equipment types) are **not** a violation of the per-user ownership rule (ADR 0002): they are fixed reference vocabularies, not user-authored data.
