import {
  type IconButtonVariants,
  iconButtonIconVariants,
  iconButtonVariants,
} from "@fitnest/shared";
import { Link, type LinkComponentProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

type Props = IconButtonVariants &
  LinkComponentProps & {
    icon: LucideIcon;
    label: string;
  };

export function IconButtonLink({ icon: Icon, label, variant, size, className, ...rest }: Props) {
  return (
    <Link aria-label={label} className={iconButtonVariants({ variant, size, className })} {...rest}>
      <Icon size={16} strokeWidth={1.75} className={iconButtonIconVariants({ variant })} />
    </Link>
  );
}
