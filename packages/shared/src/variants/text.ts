import { type VariantProps, tv } from "tailwind-variants";

// Named type scale — the typography half of the token vocabulary (docs/adr/0005).
// Structure now; roles map to Tailwind's default sizes/weights. A brand `fontFamily`
// is deferred (the preset has a slot) — the scale is independent of the family, so
// adding the font later needs no change here. Dogfoods the semantic color tokens
// (text-foreground / text-muted) so text color tracks the theme.
export const textVariants = tv({
  base: "text-foreground",
  variants: {
    role: {
      heading: "text-2xl font-semibold",
      body: "text-base font-normal",
      caption: "text-sm text-muted",
    },
  },
  defaultVariants: {
    role: "body",
  },
});

export type TextVariants = VariantProps<typeof textVariants>;
