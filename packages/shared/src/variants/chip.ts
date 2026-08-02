import { tv, type VariantProps } from "tailwind-variants";

// Filter chips (pattern filter row: All/Push/Pull/…). Active fills solid —
// distinct from Badge, which never fills.
export const chipVariants = tv({
  base: "rounded-md border px-3 py-1.5 font-condensed text-caption uppercase tracking-wide transition-colors duration-fast",
  variants: {
    active: {
      true: "border-accent-primary bg-accent-primary text-accent-primary-fg",
      false: "border-default text-secondary",
    },
  },
  defaultVariants: {
    active: false,
  },
});

export type ChipVariants = VariantProps<typeof chipVariants>;
