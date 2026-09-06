/**
 * Execution Attributes — how a movement is executed, across five independent
 * axes. See ADR 0010 and CONTEXT.md.
 *
 * These tuples are the single source of truth for the vocabulary: `@fitnest/api`
 * imports them to build its `pgEnum`s (so `drizzle-zod` derives the same union
 * types), and both apps import them to populate Library filter dropdowns.
 *
 * This module is deliberately reachable via the `@fitnest/shared/execution-attributes`
 * subpath rather than the package root. The root barrel re-exports `variants/`,
 * which pulls in `tailwind-variants`/`clsx`/`tailwind-merge` — none of which
 * belong in the standalone API server bundle. Keep this file free of any import
 * that is not type-only.
 */

export const GRIP_WIDTHS = ["close", "shoulder", "wide"] as const;
export type GripWidth = (typeof GRIP_WIDTHS)[number];

export const GRIP_ORIENTATIONS = ["pronated", "supinated", "neutral", "mixed"] as const;
export type GripOrientation = (typeof GRIP_ORIENTATIONS)[number];

export const BODY_POSITIONS = [
  "standing",
  "seated",
  "lying",
  "incline",
  "decline",
  "kneeling",
  "bent-over",
  // The body is suspended and supported only by the arms: pull-ups, dips,
  // hanging leg raises. Added while backfilling the seeded library, which had
  // eight such movements that fit none of the other values.
  "hanging",
] as const;
export type BodyPosition = (typeof BODY_POSITIONS)[number];

export const LATERALITIES = ["bilateral", "unilateral", "alternating"] as const;
export type Laterality = (typeof LATERALITIES)[number];

export const RANGES_OF_MOTION = ["full", "partial", "deficit", "pin"] as const;
export type RangeOfMotion = (typeof RANGES_OF_MOTION)[number];

/**
 * The five axes as they appear on a Template Exercise. Every axis is optional:
 * null means the axis has no value for that movement (a Squat has no grip
 * width), never "nobody filled it in" — see ADR 0010.
 */
export type ExecutionAttributes = {
  gripWidth: GripWidth | null;
  gripOrientation: GripOrientation | null;
  bodyPosition: BodyPosition | null;
  laterality: Laterality | null;
  rangeOfMotion: RangeOfMotion | null;
};

/** Axis keys in the order a name suggestion should prepend their fragments. */
export const EXECUTION_ATTRIBUTE_AXES = [
  "gripWidth",
  "gripOrientation",
  "bodyPosition",
  "laterality",
  "rangeOfMotion",
] as const;
export type ExecutionAttributeAxis = (typeof EXECUTION_ATTRIBUTE_AXES)[number];

/** The permitted values for each axis, for filter dropdowns and validation. */
export const EXECUTION_ATTRIBUTE_VALUES = {
  gripWidth: GRIP_WIDTHS,
  gripOrientation: GRIP_ORIENTATIONS,
  bodyPosition: BODY_POSITIONS,
  laterality: LATERALITIES,
  rangeOfMotion: RANGES_OF_MOTION,
} as const satisfies Record<ExecutionAttributeAxis, readonly string[]>;

/**
 * Movement patterns. Lives here rather than only as a `pgEnum` so the two copies
 * of the vocabulary cannot drift — the same reasoning ADR 0010 applies to the
 * Execution Attribute axes themselves.
 */
export const MOVEMENT_PATTERNS = [
  "push",
  "pull",
  "squat",
  "hinge",
  "lunge",
  "carry",
  "core",
] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

/**
 * Muscle groups. Here for the same reason as MOVEMENT_PATTERNS: the laterality
 * name fragment is resolved from a Template's primary target muscle.
 */
export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "quads",
  "hamstrings",
  "glutes",
  "delts",
  "biceps",
  "triceps",
  "calves",
  "core",
  "forearms",
  "traps",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Primary muscles whose unilateral variant is named for the leg, not the arm. */
const LEG_MUSCLES = new Set<MuscleGroup>(["quads", "hamstrings", "glutes", "calves"]);

// ---------------------------------------------------------------------------
// Advisory name suggestion (ADR 0010)
// ---------------------------------------------------------------------------
// `name` is user-owned text and is never derived from these attributes. The only
// consumer of what follows is the clone form, which pre-fills an editable field.
// A wrong suggestion therefore costs one edit, never a failed clone.

/**
 * The fragment each value contributes to a suggested name. `null` means the
 * value is unmarked and contributes nothing — you would not call a movement
 * "Full-ROM Bilateral Shoulder-Width Bench Press".
 *
 * `laterality.unilateral` is absent here because it is the one fragment that
 * cannot be read off the value alone: "One-Arm" or "Single-Leg" depends on the
 * movement. See `lateralityFragment`.
 */
const NAME_FRAGMENTS = {
  gripWidth: { close: "Close-Grip", shoulder: null, wide: "Wide-Grip" },
  gripOrientation: {
    pronated: "Overhand",
    supinated: "Reverse-Grip",
    neutral: "Neutral-Grip",
    mixed: "Mixed-Grip",
  },
  bodyPosition: {
    standing: "Standing",
    seated: "Seated",
    lying: "Lying",
    incline: "Incline",
    decline: "Decline",
    kneeling: "Kneeling",
    "bent-over": "Bent-Over",
    hanging: "Hanging",
  },
  laterality: { bilateral: null, unilateral: null, alternating: "Alternating" },
  rangeOfMotion: { full: null, partial: "Partial", deficit: "Deficit", pin: "Pin" },
} as const satisfies { [A in ExecutionAttributeAxis]: Record<string, string | null> };

/**
 * Unilateral is named for the limb bearing the load, which the axis value does
 * not know — so it is resolved from the Template's **primary target muscle**.
 *
 * Movement pattern is the tempting proxy and it is measurably worse (16/22 vs
 * 21/22 against the seeded library): the pattern describes what the movement
 * does, not what holds the weight, and the two diverge in both directions. A
 * Glute Kickback is `push` but is leg work; a Turkish Get-Up is `squat` but is
 * defined by a weight held overhead in one arm.
 *
 * Known residual miss: a one-arm kettlebell swing is hamstring-primary yet held
 * in one arm. The suggestion is advisory, so that costs one edit.
 */
function lateralityFragment(value: Laterality, primaryMuscle: MuscleGroup): string | null {
  if (value !== "unilateral") return NAME_FRAGMENTS.laterality[value];
  return LEG_MUSCLES.has(primaryMuscle) ? "Single-Leg" : "One-Arm";
}

/**
 * Phrases removed from the source name when an axis changes, so switching a
 * seeded "Seated Calf Raise" to standing yields "Standing Calf Raise" rather
 * than "Standing Seated Calf Raise". Broader than NAME_FRAGMENTS because the
 * seeded library spells these inconsistently ("Bent Over Row", "One-Legged
 * Deadlift", "Single Leg Push-off"). Hyphen and space are interchangeable when
 * matching, so each phrase is listed once in its hyphenated form.
 */
const STRIPPABLE = {
  gripWidth: ["Close-Grip", "Narrow-Grip", "Wide-Grip"],
  // Bare "Reverse" is deliberately absent: it would mangle "Reverse Crunch" and
  // "Reverse Hyperextension", where the word describes the movement, not a grip.
  gripOrientation: [
    "Reverse-Grip",
    "Neutral-Grip",
    "Mixed-Grip",
    "Overhand",
    "Underhand",
    "Pronated",
    "Supinated",
  ],
  bodyPosition: [
    "Standing",
    "Seated",
    "Lying",
    "Incline",
    "Decline",
    "Kneeling",
    "Bent-Over",
    "Hanging",
    "Prone",
    "Supine",
  ],
  laterality: [
    "One-Arm",
    "Single-Arm",
    "One-Legged",
    "Single-Leg",
    "One-Leg",
    "Alternating",
    "Unilateral",
  ],
  rangeOfMotion: ["Partial", "Deficit", "Pin", "Rack", "Floor"],
} as const satisfies { [A in ExecutionAttributeAxis]: readonly string[] };

/**
 * Prefix order for the suggested name, which is NOT the axis declaration order:
 * it follows how these movements are conventionally written — "Deficit
 * Single-Leg Deadlift", "Standing One-Arm Triceps Extension", "Seated
 * Close-Grip Row".
 */
const FRAGMENT_ORDER = [
  "rangeOfMotion",
  "bodyPosition",
  "laterality",
  "gripWidth",
  "gripOrientation",
] as const satisfies readonly ExecutionAttributeAxis[];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Removes `phrase` (hyphen/space-insensitive) where it appears as whole words. */
function stripPhrase(name: string, phrase: string): string {
  const pattern = phrase.split("-").map(escapeRegExp).join("[-\\s]");
  return name.replace(new RegExp(`\\b${pattern}\\b[-\\s]*`, "gi"), "");
}

/**
 * Suggests a name for a variant being cloned from `sourceName`.
 *
 * Only axes whose value *changed* contribute: unchanged axes are left alone, so
 * a Bench Press stays a Bench Press rather than becoming a "Lying Bilateral
 * Bench Press". For each changed axis the source name is stripped of that axis's
 * known phrases, then the new value's fragment is prepended in FRAGMENT_ORDER.
 *
 * Returns the source name unchanged when nothing changed — ADR 0004 already
 * requires the user to rename a clone, so there is nothing to invent here.
 */
export function suggestVariantName(input: {
  sourceName: string;
  /** The source Template's primary target muscle — resolves "One-Arm" vs "Single-Leg". */
  primaryMuscle: MuscleGroup;
  source: Partial<ExecutionAttributes>;
  variant: Partial<ExecutionAttributes>;
}): string {
  const { sourceName, primaryMuscle, source, variant } = input;

  const changed = FRAGMENT_ORDER.filter(
    (axis) => (source[axis] ?? null) !== (variant[axis] ?? null),
  );
  if (changed.length === 0) return sourceName;

  let base = sourceName;
  for (const axis of changed) {
    for (const phrase of STRIPPABLE[axis]) base = stripPhrase(base, phrase);
  }
  base = base.replace(/\s{2,}/g, " ").trim();

  const prefixes: string[] = [];
  for (const axis of FRAGMENT_ORDER) {
    if (!changed.includes(axis)) continue;
    const value = variant[axis] ?? null;
    if (value === null) continue;
    const fragment =
      axis === "laterality"
        ? lateralityFragment(value as Laterality, primaryMuscle)
        : (NAME_FRAGMENTS[axis] as Record<string, string | null>)[value as string];
    if (fragment) prefixes.push(fragment);
  }

  return [...prefixes, base].filter(Boolean).join(" ").trim();
}
