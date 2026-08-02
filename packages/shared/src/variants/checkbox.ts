import { tv, type VariantProps } from "tailwind-variants";

export const checkboxVariants = tv({
  base: "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors duration-fast",
  variants: {
    checked: {
      true: "border-accent-primary bg-accent-primary",
      false: "border-default bg-surface-canvas",
    },
  },
  defaultVariants: {
    checked: false,
  },
});

export type CheckboxVariants = VariantProps<typeof checkboxVariants>;
