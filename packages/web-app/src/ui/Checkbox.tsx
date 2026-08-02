import { checkboxVariants } from "@fitnest/shared";
import { Check } from "lucide-react";

export function Checkbox({
  checked,
  onChange,
  label,
  hideLabel = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  // For standalone checkboxes (e.g. a table cell): keeps `label` as the
  // accessible name (aria-label) without rendering it visibly.
  hideLabel?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="sr-only"
      />
      <span className={checkboxVariants({ checked })}>
        {checked ? <Check size={12} strokeWidth={3} className="text-accent-primary-fg" /> : null}
      </span>
      {hideLabel ? null : <span className="text-body-sm text-primary">{label}</span>}
    </label>
  );
}
