// Every seeded exercise's starting Backup Exercises, derived from the library
// rather than hand-listed: 156 exercises × 3 backups is not a list anyone can
// keep honest by hand, and it would go stale the moment an exercise is added.
//
// A backup is "the substitute to reach for when you can't do this movement"
// (CONTEXT.md → Backup Exercise), so candidates are ranked on three signals, in
// strict priority order — each one only breaks ties left by the one above it:
//
//   1. Name similarity. Shared words, weighted by how rare the word is across
//      the library, so matching on "Deadlift" counts for far more than matching
//      on "Seated". Measured as the share of *this* exercise's name-weight the
//      candidate covers, which is deliberately asymmetric: "Barbell Deadlift"
//      is a strong backup for "Deadlift Variation" more readily than the
//      reverse.
//   2. Same movement, different implement. The pair a lifter actually wants
//      when the rack is taken: identical movement pattern and identical primary
//      muscles, differing only in equipment or an Execution Attribute. This is
//      exactly the `Barbell Deadlift`/`Cable Deadlift` shape the seed names now
//      spell out (ADR 0011).
//   3. Main muscle groups. Primary-muscle overlap, then movement pattern, then
//      secondary muscles — the fallback for movements with no near-twin.
//
// The one deviation from strict priority is the relevance damp below: a shared
// word between movements that train nothing in common ("Bench Press" / "Bench
// Dips") is a coincidence of naming, not a substitution, so its name score is
// cut rather than allowed to outrank a genuine muscle match.
import { SEED_EXERCISES } from "./exercises.js";
import type { SeedBackupLink, SeedExercise } from "./types.js";

/** How many backups each exercise gets, when the candidates are good enough. */
const MAX_BACKUPS = 3;

/** The floor for keeping a third backup, as a share of the best candidate's
 *  score. Two is the guaranteed minimum; a weak third is worse than none. */
const THIRD_BACKUP_THRESHOLD = 0.4;

/** Applied when a candidate shares a word but trains nothing in common;
 *  halved again when the movement pattern differs as well. */
const IRRELEVANT_NAME_DAMP = 0.5;

// Weights, spaced so a lower signal can never outrank a higher one: the maximum
// achievable muscle score is smaller than the smallest meaningful name gap.
const NAME_WEIGHT = 100;
const SAME_MOVEMENT_WEIGHT = 10;

// Words that say what you hold, not what you do. Dropped before comparing
// names, because differing equipment is signal #2's job — leaving them in would
// make "Barbell Row" and "Barbell Curl" look alike for the wrong reason.
const EQUIPMENT_WORDS = new Set([
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
  "kettlebell",
  "band",
  "foam",
  "roller",
  "medicine",
  "exercise",
  "ball",
  "ez",
  "bar",
  "smith",
  "with",
  "and",
  "the",
]);

// The library spells the same compound three ways — "Pullups", "Pull-In",
// "Lat Pulldown" — so tokens are normalised before comparison or none of them
// would look related. Plurals collapse ("Bench Dips" ~ "Dip", "Rack Pulls" ~
// "Pull Through"), and a glued particle is split off its root, which is what
// lets "Pullups" reach "Lat Pulldown". Words ending in a double s are left
// alone so "Press" does not become "Pres".
const GLUED_COMPOUND = /^(pull|push|sit|chin|step|lay|hold)(up|down|over|out|in|off|through)$/;

function normalizeToken(token: string): string[] {
  const singular =
    token.length > 3 && token.endsWith("s") && !token.endsWith("ss") ? token.slice(0, -1) : token;
  const [, root, particle] = GLUED_COMPOUND.exec(singular) ?? [];
  return root && particle ? [root, particle] : [singular];
}

function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z]+/)
    .flatMap(normalizeToken)
    .filter((token) => token.length > 1 && !EQUIPMENT_WORDS.has(token));
}

function primaryMuscles(exercise: SeedExercise): Set<string> {
  return new Set(exercise.muscles.filter((m) => m.role === "primary").map((m) => m.muscleGroup));
}

function allMuscles(exercise: SeedExercise): Set<string> {
  return new Set(exercise.muscles.map((m) => m.muscleGroup));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const value of a) if (b.has(value)) shared++;
  return shared / (a.size + b.size - shared);
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

/** The Execution Attributes + equipment that distinguish two otherwise
 *  identical movements (ADR 0010). */
function executionSignature(exercise: SeedExercise): string {
  return [
    exercise.equipment,
    exercise.bodyPosition,
    exercise.laterality,
    exercise.gripOrientation,
    exercise.rangeOfMotion,
  ].join("|");
}

/**
 * Inverse document frequency per name token: a word used by two exercises
 * identifies a movement, a word used by forty barely narrows anything.
 */
function buildTokenWeights(exercises: SeedExercise[]): Map<string, number> {
  const documentFrequency = new Map<string, number>();
  for (const exercise of exercises) {
    for (const token of new Set(tokenize(exercise.name))) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const weights = new Map<string, number>();
  for (const [token, frequency] of documentFrequency) {
    weights.set(token, Math.log(exercises.length / frequency));
  }
  return weights;
}

/**
 * Rank one candidate as a backup for `exercise`. Higher is better; the score is
 * only ever compared against other candidates for the same exercise.
 */
function score(
  exercise: SeedExercise,
  candidate: SeedExercise,
  tokenWeights: Map<string, number>,
): number {
  const ownTokens = new Set(tokenize(exercise.name));
  const candidateTokens = new Set(tokenize(candidate.name));

  let ownWeight = 0;
  let sharedWeight = 0;
  for (const token of ownTokens) {
    const weight = tokenWeights.get(token) ?? 0;
    ownWeight += weight;
    if (candidateTokens.has(token)) sharedWeight += weight;
  }

  const ownPrimary = primaryMuscles(exercise);
  const candidatePrimary = primaryMuscles(candidate);
  const primaryOverlap = jaccard(ownPrimary, candidatePrimary);
  const samePattern = exercise.movementPattern === candidate.movementPattern;

  // Signal 3, and the relevance gate for signal 1.
  const muscleScore =
    3 * primaryOverlap +
    (samePattern ? 1 : 0) +
    jaccard(allMuscles(exercise), allMuscles(candidate));

  // A shared word between movements with no primary muscle in common is a
  // coincidence of naming, not a substitution — "Bench Press" and "Bench Dips"
  // share a bench and nothing else. Damped rather than zeroed, hard when the
  // movement pattern differs too.
  //
  // When they share no muscle *at all*, the name signal is discarded outright:
  // "Glute Kickback" and "Tricep Kickback" are not substitutes under any
  // reading, so such a pair may only ever be chosen on merit it does not have.
  const sharesAnyMuscle = jaccard(allMuscles(exercise), allMuscles(candidate)) > 0;
  let nameScore = ownWeight > 0 ? sharedWeight / ownWeight : 0;
  if (!sharesAnyMuscle) {
    nameScore = 0;
  } else if (primaryOverlap === 0) {
    nameScore *= samePattern ? IRRELEVANT_NAME_DAMP : IRRELEVANT_NAME_DAMP / 2;
  }

  // Signal 2: the same movement reached with a different implement or setup.
  const sameMovement =
    samePattern && sameSet(ownPrimary, candidatePrimary)
      ? executionSignature(exercise) !== executionSignature(candidate)
        ? 1
        : 0
      : 0;

  return NAME_WEIGHT * nameScore + SAME_MOVEMENT_WEIGHT * sameMovement + muscleScore;
}

function buildBackupLinks(exercises: SeedExercise[]): SeedBackupLink[] {
  const tokenWeights = buildTokenWeights(exercises);
  const links: SeedBackupLink[] = [];

  for (const exercise of exercises) {
    const ranked = exercises
      .filter((candidate) => candidate.name !== exercise.name)
      .map((candidate) => ({ candidate, value: score(exercise, candidate, tokenWeights) }))
      // Name break for determinism: the seed must be byte-identical run to run.
      .sort((a, b) => b.value - a.value || a.candidate.name.localeCompare(b.candidate.name))
      .slice(0, MAX_BACKUPS);

    const best = ranked[0]?.value ?? 0;
    const chosen = ranked.filter(
      (entry, index) => index < 2 || entry.value >= best * THIRD_BACKUP_THRESHOLD,
    );

    for (const { candidate } of chosen) {
      links.push({ exercise: exercise.name, backup: candidate.name });
    }
  }

  return links;
}

/**
 * Backup links for the whole seeded library, in rank order per exercise (the
 * seeder turns that order into each link's `position`). Every exercise gets at
 * least two.
 */
export const SEED_BACKUP_LINKS: SeedBackupLink[] = buildBackupLinks(SEED_EXERCISES);
