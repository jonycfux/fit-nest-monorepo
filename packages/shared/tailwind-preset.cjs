// Shared Tailwind preset — the design-token bridge for web (Tailwind v3) + native
// (NativeWind v4). Authored as CommonJS (.cjs) so both apps' config loaders can
// consume it: mobile via `require()`, web via ESM default-import (docs/adr/0005).
//
// Color holds NO literal values here. It derives two things from the single source
// of truth (tokens/semantic.cjs):
//   1. `colors` — each semantic role → `rgb(var(--role) / <alpha-value>)`, so a
//      class like `bg-surface-app` reads a CSS variable and opacity utilities work.
//   2. a base plugin that injects the dark theme's variable *values* into `:root`.
//      This is NativeWind v4's documented theming pattern (addBase → :root) and
//      resolves on both platforms. A future light theme = a second override.
//
// Typography/spacing/radii/shadow/motion are STATIC preset values (no var()) per
// docs/adr/0005 — only color is theme-swapped. Values are the "Storefront Slate"
// design handoff (2026-07-26).
const semantic = require("./tokens/semantic.cjs");

const roles = Object.keys(semantic.dark);

/** semantic role -> `rgb(var(--role) / <alpha-value>)` */
const colors = Object.fromEntries(
  roles.map((role) => [role, `rgb(var(--${role}) / <alpha-value>)`]),
);

/** a theme's { role: triplet } -> { "--role": triplet } */
const toVars = (theme) =>
  Object.fromEntries(Object.entries(theme).map(([role, value]) => [`--${role}`, value]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors,
      fontFamily: {
        condensed: ['"Barlow Condensed"', '"Barlow"', "system-ui", "sans-serif"],
        body: ['"Barlow"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", '"SF Mono"', "Menlo", "monospace"],
      },
      fontSize: {
        "display-1": "clamp(40px, 5vw, 64px)",
        "display-2": "clamp(32px, 4vw, 48px)",
        h1: "32px",
        h2: "24px",
        h3: "20px",
        h4: "16px",
        "body-lg": "16px",
        body: "14px",
        "body-sm": "13px",
        caption: "12px",
        micro: "11px",
      },
      lineHeight: {
        tight: "1.1",
        snug: "1.3",
        normal: "1.55",
        relaxed: "1.7",
      },
      letterSpacing: {
        tight: "-0.01em",
        normal: "0",
        wide: "0.06em",
        widest: "0.16em",
      },
      // Static (theme-invariant) tokens — no CSS variables needed (docs/adr/0005).
      // Near-sharp scale, load-bearing for the "dense catalog" feel.
      borderRadius: {
        sm: "0px",
        md: "2px",
        lg: "3px",
        xl: "4px",
        full: "999px",
      },
      boxShadow: {
        sm: "0 1px 0 0 rgba(0,0,0,0.5)",
        md: "0 6px 18px rgba(0,0,0,0.55)",
        "inset-top": "inset 0 1px 0 rgba(255,255,255,0.08)",
        "glow-primary": "0 0 0 3px color-mix(in oklch, rgb(var(--accent-primary)) 30%, transparent)",
        "glow-focus": "0 0 0 2px rgb(var(--surface-app)), 0 0 0 4px rgb(var(--state-focus-ring))",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2,0,0,1)",
        terminal: "cubic-bezier(0.2,0,0,1)",
      },
      transitionDuration: {
        fast: "100ms",
        base: "150ms",
        slow: "240ms",
      },
      // Structural gradients only — never decorative (chrome bars, feature panels,
      // filled accent buttons). `feature` aliases `panel`: surface-feature in the
      // design handoff is this same gradient, promoted here since backgroundImage
      // (not `colors`) is the only place a gradient token can live.
      backgroundImage: {
        chrome: "linear-gradient(180deg, rgb(var(--surface-app)), rgb(var(--surface-canvas)))",
        panel: "linear-gradient(135deg, rgb(var(--surface-raised)), rgb(var(--surface-canvas)))",
        feature: "linear-gradient(135deg, rgb(var(--surface-raised)), rgb(var(--surface-canvas)))",
        primary: "linear-gradient(180deg, rgb(var(--accent-primary)), rgb(var(--accent-primary-dim)))",
        secondary:
          "linear-gradient(180deg, rgb(var(--accent-secondary)), rgb(var(--accent-secondary-dim)))",
        success: "linear-gradient(180deg, rgb(var(--accent-success)), rgb(var(--accent-success-dim)))",
      },
    },
  },
  plugins: [
    ({ addBase }) =>
      addBase({
        ":root": toVars(semantic.dark),
        // ".light:root": toVars(semantic.light),  ← added if/when a light theme is designed
      }),
  ],
};
