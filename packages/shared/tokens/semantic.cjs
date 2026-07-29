// Semantic tokens — role → primitive, PER THEME. This is the single source of
// truth for what each themeable color role resolves to. A theme swaps the
// *mapping*, not the palette (docs/adr/0005). `className`s only ever name these
// semantic roles (bg-surface-app, text-heading), so a future light theme is
// additive: add a `light` map below and the preset plugin emits the override.
const p = require("./primitives.cjs");

/** @type {Record<string, Record<string, string>>} */
module.exports = {
  // "Storefront Slate" — the only theme today; the product is dark-native (no
  // light variant was designed). Named `dark` (not `light`) so a real light theme
  // can be added later as `light` without renaming this one.
  dark: {
    // surfaces
    "surface-app": p.bgApp,
    "surface-canvas": p.bg,
    "surface-card": p.panel,
    "surface-raised": p.panel2,
    "surface-overlay": p.panel2,
    "surface-sunken": p.bgDeep,
    // borders
    "border-subtle": p.black,
    "border-default": p.lineSoft,
    "border-strong": p.lineStrong,
    // text
    "text-heading": p.white,
    "text-primary": p.fg,
    "text-secondary": p.fg2,
    "text-muted": p.fg3,
    "text-disabled": p.fg4,
    "text-inverse": p.bgDeep,
    "text-link": p.cyan,
    "text-link-hover": p.linkHover,
    // accent-primary: fill only (buttons, commit/save, selected state, focus ring).
    // Too dark to carry small text/icons on slate — use accent-primary-text for that.
    "accent-primary": p.azure,
    "accent-primary-dim": p.azureDim,
    "accent-primary-fg": p.primaryFg,
    "accent-primary-text": p.azureLift,
    // accent-secondary: wayfinding only — links, active nav/tab, chrome meta, tags.
    "accent-secondary": p.cyan,
    "accent-secondary-dim": p.cyanDim,
    "accent-secondary-fg": p.secondaryFg,
    // accent-success: progress/achievement only — progress bars, completed sets,
    // streaks, PRs. Dim is ~4:1 contrast — fills/borders only, never small text.
    "accent-success": p.green,
    "accent-success-dim": p.greenDim,
    "accent-success-fg": p.successFg,
    // states
    "state-success": p.green,
    "state-warning": p.amber,
    "state-danger": p.red,
    "state-info": p.cyan,
    "state-focus-ring": p.azure,
    // chrome / misc
    "chrome-underline": p.cyan,
    "tag-bg": p.black,
    // tags-only accent, not part of the primary/secondary/success role triad
    "sl-violet": p.violet,
  },
  // light: { … }  ← added if/when a light theme is designed.
};
