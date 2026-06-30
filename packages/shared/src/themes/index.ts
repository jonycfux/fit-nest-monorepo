// Typed token values for the rare cases code needs a raw value outside `className`
// (e.g. a hex passed to React Native's StatusBar or a charting lib). The Tailwind
// preset (../../tailwind-preset.cjs) remains the source of truth for class-based styling.
export const colors = {
  primary: "#16a34a",
  primaryForeground: "#ffffff",
  secondary: "#e2e8f0",
  secondaryForeground: "#0f172a",
  background: "#ffffff",
  foreground: "#0a0a0a",
  muted: "#64748b",
} as const;

export type ColorToken = keyof typeof colors;
