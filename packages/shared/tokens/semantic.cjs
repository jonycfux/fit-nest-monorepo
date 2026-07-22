// Semantic tokens — role → primitive, PER THEME. This is the single source of
// truth for what each themeable color role resolves to. A theme swaps the
// *mapping*, not the palette (docs/adr/0005). `className`s only ever name these
// semantic roles (bg-primary, text-foreground), so dark mode later is additive:
// add a `dark` map below and the preset plugin emits the override.
const p = require("./primitives.cjs");

/** @type {Record<string, Record<string, string>>} */
module.exports = {
  light: {
    primary: p.green600,
    "primary-foreground": p.white,
    secondary: p.slate200,
    "secondary-foreground": p.slate900,
    background: p.white,
    foreground: p.slate950,
    muted: p.slate500,
  },
  // dark: { … }  ← added when dark mode lands; same keys, different primitives.
};
