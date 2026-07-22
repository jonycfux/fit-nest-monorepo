import { type VariantProps, tv } from "tailwind-variants";

// Platform-agnostic Tailwind class definitions. The same call produces the same
// class string for a web <button> and a native <Pressable> (via NativeWind).
export const buttonVariants = tv({
  base: "flex flex-row items-center justify-center rounded-lg",
  variants: {
    variant: {
      primary: "bg-primary",
      secondary: "bg-secondary",
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
      primary: "text-primary-foreground",
      secondary: "text-secondary-foreground",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});
