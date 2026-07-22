// Typed, theme-aware view of the semantic tokens for the rare **imperative** need
// — a raw color handed to a non-`className` API (RN StatusBar, a gradient, a chart
// lib). `className` styling should use the semantic Tailwind classes (bg-primary,
// text-foreground) instead; those read CSS variables and follow the theme for free.
//
// The values derive from the single source of truth (tokens/semantic.cjs) — no
// second hex map lives here (docs/adr/0005). When the first imperative consumer
// appears, this graduates to a `useColorScheme`-aware hook so it tracks dark mode.
import semantic from "../../tokens/semantic.cjs";

/** Available theme names (currently just "light"). */
export type ThemeName = keyof typeof semantic;

/** A themeable color role (primary, background, foreground, …). */
export type SemanticToken = keyof (typeof semantic)["light"];

/**
 * Resolve a theme's semantic roles to concrete `rgb(...)` strings.
 * @example getThemeColors().background // "rgb(255 255 255)"
 */
export function getThemeColors(theme: ThemeName = "light"): Record<SemanticToken, string> {
  return Object.fromEntries(
    Object.entries(semantic[theme]).map(([role, triplet]) => [role, `rgb(${triplet})`]),
  ) as Record<SemanticToken, string>;
}
