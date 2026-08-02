import { chipVariants } from "@fitnest/shared";
import type { ButtonHTMLAttributes } from "react";

export function Chip({
  active,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return <button type="button" className={chipVariants({ active, className })} {...rest} />;
}
