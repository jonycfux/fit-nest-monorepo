import { panelWindowVariants } from "@fitnest/shared";
import type { ReactNode } from "react";

const slots = panelWindowVariants();

export function PanelWindow({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={slots.base()}>
      <div className={slots.header()}>
        <span className={slots.title()}>{title}</span>
        {meta ? <span className={slots.meta()}>{meta}</span> : null}
      </div>
      <div className={slots.body()}>{children}</div>
    </div>
  );
}
