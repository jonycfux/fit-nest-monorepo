# Crossing the deferred line: per-platform `ui/` wrapper components

[ADR 0005](0005-shared-design-tokens-two-tier-css-variables-cjs-source.md) deliberately deferred app-local `ui/` wrapper components, keeping `@fitnest/shared` a pure styling contract (tokens + `tailwind-variants` class-string functions) with "app-local `ui/` wrappers... introduced only on real reuse... not speculatively." The core-UI-components handoff is that threshold: six screens across two platforms each reuse the same ~8 primitives (Badge, PanelWindow, IconButton, Input, Select, Checkbox, stepper), so hand-assembling variant classes inline on every screen was judged worse than writing the wrappers now.

We're building `src/ui/` in each of `web-app` and `mobile-app` — thin component wrappers that apply `@fitnest/shared`'s `tv()` variants to that platform's own primitive (`<div>`/`<button>` on web, `<View>`/`<Pressable>` on mobile). `@fitnest/shared` itself is unchanged by this: it still exports only variant definitions and types, never components — the no-`react-native-web`, no-shared-component-tree decision from ADR 0005 stands. Each app's `ui/` folder is local, platform-specific, and not exported cross-package.

## Consequences

- Mobile's `Select` has no native equivalent worth using here (see the plan doc): it's a custom in-app dropdown built from `Pressable` + an overlay, styled to the same tokens as web's native `<select>`, to preserve pixel fidelity with the handoff rather than adopt a native OS control's look.
- Future primitives follow the same rule ADR 0005 set: add to the shared variant catalogue on a second consumer, then wrap it in both apps' `ui/` folders — never add a component to `@fitnest/shared` itself.
