import { type ButtonVariants, buttonTextVariants, buttonVariants } from "@fitnest/shared";
import { Link, type LinkComponentProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Props = ButtonVariants & Omit<LinkComponentProps, "children"> & { children: ReactNode };

// Same look as Button, but renders an <a> (via Link) — for cases where the
// action is real navigation. Never nest a <button> inside a Link's <a>.
export function ButtonLink({ variant, size, className, children, ...rest }: Props) {
  return (
    <Link className={buttonVariants({ variant, size, className })} {...rest}>
      <span className={buttonTextVariants({ variant })}>{children}</span>
    </Link>
  );
}
