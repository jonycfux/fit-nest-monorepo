import { tv, type VariantProps } from "tailwind-variants";

// Outlined pill, never filled — matches the handoff's Badge (border + text only,
// transparent background) across Library/Detail/Plan Builder screens.
export const badgeVariants = tv({
  base: "inline-flex items-center rounded-sm border px-2 py-0.5 font-condensed text-micro font-medium uppercase tracking-wide",
  variants: {
    tone: {
      // Movement pattern badges (PUSH/PULL/…) — the one "info" use in the handoff.
      info: "border-state-info text-state-info",
      // Equipment / muscle badges — the default, unopinionated tone.
      neutral: "border-default text-secondary",
      // "Active" plan badge — the only filled-adjacent tone (still text-safe).
      primary: "border-accent-primary-text text-accent-primary-text",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export type BadgeVariants = VariantProps<typeof badgeVariants>;
