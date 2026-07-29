import { type VariantProps, tv } from "tailwind-variants";

// Named type scale — the typography half of the token vocabulary (docs/adr/0005).
// Roles map to the "Storefront Slate" scale/family tokens in the shared preset.
// Dogfoods the semantic color tokens (text-heading / text-primary / text-muted) so
// text color tracks the theme.
export const textVariants = tv({
  base: "font-body",
  variants: {
    role: {
      // Matches the handoff's h1-h6 treatment: condensed, uppercase, wide tracking.
      heading: "font-condensed font-semibold uppercase tracking-wide text-h2 text-heading",
      body: "text-body font-normal text-primary",
      caption: "text-caption text-muted",
    },
  },
  defaultVariants: {
    role: "body",
  },
});

export type TextVariants = VariantProps<typeof textVariants>;
