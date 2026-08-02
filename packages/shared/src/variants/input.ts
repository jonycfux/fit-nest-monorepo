import { tv, type VariantProps } from "tailwind-variants";

export const inputVariants = tv({
  base: "w-full rounded-md border border-default bg-surface-canvas px-3 py-2 text-body text-primary transition-colors duration-fast placeholder:text-muted focus:shadow-glow-focus focus:outline-none",
  variants: {
    hasIcon: {
      true: "pl-9",
    },
  },
  defaultVariants: {
    hasIcon: false,
  },
});

export type InputVariants = VariantProps<typeof inputVariants>;

// Multi-line variant for the Exercise Edit "Note" field (min-height ~64–72px per handoff).
export const textareaVariants = tv({
  base: "min-h-[72px] w-full rounded-md border border-default bg-surface-canvas px-3 py-2 text-body text-primary transition-colors duration-fast placeholder:text-muted focus:shadow-glow-focus focus:outline-none",
});

// Web's native <select> and mobile's custom dropdown trigger share this look.
export const selectVariants = tv({
  base: "w-full rounded-md border border-default bg-surface-canvas px-3 py-2 text-left text-body text-primary transition-colors duration-fast focus:shadow-glow-focus focus:outline-none",
});
