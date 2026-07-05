# Per-user ownership of the plan/workout/exercise graph

Every domain entity — Plan, Workout, Template Exercise, and all training history — is owned by exactly one User, and there is **no cross-user sharing or reading**: User A cannot see or reference User B's Template Exercises. In particular there is **no single global "Bench Press"**; each user has their own Template Exercise library, and new users are seeded with their own copies of the classic exercises via a signup seed script (not yet built).

## Considered Options

- **Global canonical Template Exercise catalog** (one shared "Bench Press" row everyone references): rejected for now. It complicates ownership/privacy, invites cross-user coupling, and forces catalog governance we don't want yet — at the cost of duplicated Template Exercise rows across users, which we accept.

## Consequences

- "Bench Press" exists as N rows (one per user who has it). Cross-user analytics or a community/shared-exercise feature would require reconciling these duplicates later — a deliberate deferral.
- New-user onboarding depends on a seed script to populate the classic exercises; without it, a new user's library is empty.
- Every query and tRPC procedure over this graph must scope by the owning User; the current `publicProcedure` handlers with a nullable `userId` are a placeholder to be replaced once identity/auth lands.
