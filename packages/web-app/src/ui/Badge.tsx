import { type BadgeVariants, badgeVariants } from "@fitnest/shared";
import type { ReactNode } from "react";

export function Badge({ tone, children }: BadgeVariants & { children: ReactNode }) {
  return <span className={badgeVariants({ tone })}>{children}</span>;
}
