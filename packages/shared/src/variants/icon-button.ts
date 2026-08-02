import { tv, type VariantProps } from "tailwind-variants";

// Square icon-only buttons: catalog edit/add/remove, cart stepper (−/+)/remove,
// header back button. Distinct from buttonVariants (which is label-carrying and
// flex-row), since icon buttons are fixed-aspect squares.
export const iconButtonVariants = tv({
  base: "flex shrink-0 items-center justify-center rounded-md border transition-[filter,transform] duration-fast ease-standard hover:brightness-110 active:scale-[0.97]",
  variants: {
    variant: {
      primary: "border-accent-primary bg-accent-primary",
      secondary: "border-default bg-surface-raised",
    },
    size: {
      sm: "h-7 w-7",
      md: "h-[34px] w-[34px]",
    },
  },
  defaultVariants: {
    variant: "secondary",
    size: "md",
  },
});

export type IconButtonVariants = VariantProps<typeof iconButtonVariants>;

// Icon color tracks the button variant, mirroring buttonTextVariants.
export const iconButtonIconVariants = tv({
  variants: {
    variant: {
      primary: "text-accent-primary-fg",
      secondary: "text-primary",
    },
  },
  defaultVariants: {
    variant: "secondary",
  },
});
