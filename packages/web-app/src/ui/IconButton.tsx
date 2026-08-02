import {
  type IconButtonVariants,
  iconButtonIconVariants,
  iconButtonVariants,
} from "@fitnest/shared";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Props = IconButtonVariants &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> & {
    icon: LucideIcon;
    label: string; // required — icon-only buttons need an accessible name
  };

export function IconButton({ icon: Icon, label, variant, size, className, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      className={iconButtonVariants({ variant, size, className })}
      {...rest}
    >
      <Icon size={16} strokeWidth={1.75} className={iconButtonIconVariants({ variant })} />
    </button>
  );
}
