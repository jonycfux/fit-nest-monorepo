// Types for semantic.cjs — gives `src/themes` a typed view of the per-theme token
// maps without enabling `allowJs`. The `.cjs` stays the runtime source of truth
// (docs/adr/0005); this only describes its shape. `SemanticRole` is internal here
// (used to shape `light`); consumers derive their role/theme unions via `keyof`.
// Keep these roles in sync with semantic.cjs (adding a role touches both).

type SemanticRole =
  | "primary"
  | "primary-foreground"
  | "secondary"
  | "secondary-foreground"
  | "background"
  | "foreground"
  | "muted";

declare const semantic: {
  readonly light: Readonly<Record<SemanticRole, string>>;
  // readonly dark: Readonly<Record<SemanticRole, string>>;  ← added with dark mode
};

export = semantic;
