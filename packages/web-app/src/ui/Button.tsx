import { type ButtonVariants, buttonTextVariants, buttonVariants } from "@fitnest/shared";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonVariants &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { children: ReactNode };

export function Button({ variant, size, className, children, ...rest }: Props) {
  return (
    <button type="button" className={buttonVariants({ variant, size, className })} {...rest}>
      <span className={buttonTextVariants({ variant })}>{children}</span>
    </button>
  );
}
