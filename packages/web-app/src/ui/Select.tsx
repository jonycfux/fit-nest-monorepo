import { selectVariants } from "@fitnest/shared";
import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

type Option = { value: string; label: string };

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  options: Option[];
};

export function Select({ options, className, ...rest }: Props) {
  return (
    <div className="relative">
      <select
        className={selectVariants({ className: `appearance-none pr-8 ${className ?? ""}` })}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={2}
        className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 text-muted"
      />
    </div>
  );
}
