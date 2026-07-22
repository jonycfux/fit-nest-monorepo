// Shared Tailwind preset — the design-token bridge for web (Tailwind v3) + native
// (NativeWind v4). Authored as CommonJS (.cjs) so both apps' config loaders can
// consume it: mobile via `require()`, web via ESM default-import (docs/adr/0005).
//
// Holds NO color values. It derives two things from the single source of truth
// (tokens/semantic.cjs):
//   1. `colors` — each semantic role → `rgb(var(--role) / <alpha-value>)`, so a
//      class like `bg-primary` reads a CSS variable and opacity utilities work.
//   2. a base plugin that injects the light theme's variable *values* into `:root`.
//      This is NativeWind v4's documented theming pattern (addBase → :root) and
//      resolves on both platforms. Dark mode later = emit a `.dark:root` override.
const semantic = require("./tokens/semantic.cjs");

const roles = Object.keys(semantic.light);

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
      // Static (theme-invariant) tokens — no CSS variables needed (docs/adr/0005).
      borderRadius: {
        lg: "12px",
      },
      // fontFamily: { … }  ← brand font slot, added when a typeface is chosen.
    },
  },
  plugins: [
    ({ addBase }) =>
      addBase({
        ":root": toVars(semantic.light),
        // ".dark:root": toVars(semantic.dark),  ← added with dark mode
      }),
  ],
};
