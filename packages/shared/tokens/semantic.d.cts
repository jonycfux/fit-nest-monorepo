// Types for semantic.cjs — gives `src/themes` a typed view of the per-theme token
// maps without enabling `allowJs`. The `.cjs` stays the runtime source of truth
// (docs/adr/0005); this only describes its shape. `SemanticRole` is internal here
// (used to shape `dark`); consumers derive their role/theme unions via `keyof`.
// Keep these roles in sync with semantic.cjs (adding a role touches both).

type SemanticRole =
  | "surface-app"
  | "surface-canvas"
  | "surface-card"
  | "surface-raised"
  | "surface-overlay"
  | "surface-sunken"
  | "border-subtle"
  | "border-default"
  | "border-strong"
  | "text-heading"
  | "text-primary"
  | "text-secondary"
  | "text-muted"
  | "text-disabled"
  | "text-inverse"
  | "text-link"
  | "text-link-hover"
  | "accent-primary"
  | "accent-primary-dim"
  | "accent-primary-fg"
  | "accent-primary-text"
  | "accent-secondary"
  | "accent-secondary-dim"
  | "accent-secondary-fg"
  | "accent-success"
  | "accent-success-dim"
  | "accent-success-fg"
  | "state-success"
  | "state-warning"
  | "state-danger"
  | "state-info"
  | "state-focus-ring"
  | "chrome-underline"
  | "tag-bg"
  | "sl-violet";

declare const semantic: {
  readonly dark: Readonly<Record<SemanticRole, string>>;
  // readonly light: Readonly<Record<SemanticRole, string>>;  ← added if/when a light theme is designed
};

export = semantic;
