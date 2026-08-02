import { tv, type VariantProps } from "tailwind-variants";

// Named type scale — the typography half of the token vocabulary (docs/adr/0005).
// `role` controls family/weight/case/color, `size` controls the text-size token —
// independent axes, since e.g. a heading role appears at both h1 (screen titles)
// and caption size (PanelWindow titles). Dogfoods the semantic color tokens
// (text-heading / text-primary / text-muted) so text color tracks the theme.
export const textVariants = tv({
  base: "font-body",
  variants: {
    role: {
      // Matches the handoff's chrome/heading treatment: condensed, uppercase, wide tracking.
      heading: "font-condensed font-semibold uppercase tracking-wide text-heading",
      body: "font-normal text-primary",
      secondary: "font-normal text-secondary",
      caption: "text-muted",
      // Micro caps labels ("WELCOME BACK", field labels) — condensed + uppercase like
      // heading, but muted rather than the heading color.
      micro: "font-condensed uppercase tracking-wide text-muted",
    },
    size: {
      h1: "text-h1",
      h2: "text-h2",
      h3: "text-h3",
      h4: "text-h4",
      body: "text-body",
      "body-sm": "text-body-sm",
      caption: "text-caption",
      micro: "text-micro",
    },
  },
  defaultVariants: {
    role: "body",
    size: "body",
  },
});

export type TextVariants = VariantProps<typeof textVariants>;
