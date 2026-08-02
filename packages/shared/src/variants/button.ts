import { tv, type VariantProps } from "tailwind-variants";

// Platform-agnostic Tailwind class definitions. The same call produces the same
// class string for a web <button> and a native <Pressable> (via NativeWind).
export const buttonVariants = tv({
  base: "flex flex-row items-center justify-center rounded-lg transition-[filter,transform] duration-fast ease-standard hover:brightness-110 active:scale-[0.97]",
  variants: {
    variant: {
      // Fill only — accent-primary is too dark to carry small text on slate.
      primary: "bg-accent-primary",
      // Neutral surface, not accent-secondary: the design handoff reserves cyan
      // for wayfinding (links, active tabs) only, "one job each — do not blend."
      secondary: "bg-surface-raised border border-default",
    },
    size: {
      sm: "px-3 py-1.5",
      md: "px-4 py-2",
      lg: "px-6 py-3",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export type ButtonVariants = VariantProps<typeof buttonVariants>;

// Matching label classes so text color tracks the button variant on both platforms.
export const buttonTextVariants = tv({
  base: "text-base font-medium",
  variants: {
    variant: {
      primary: "text-accent-primary-fg",
      secondary: "text-primary",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});
