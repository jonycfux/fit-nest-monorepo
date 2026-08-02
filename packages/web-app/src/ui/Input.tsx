import { inputVariants, textareaVariants } from "@fitnest/shared";
import type { LucideIcon } from "lucide-react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: LucideIcon;
};

export function Input({ icon: Icon, className, ...rest }: InputProps) {
  if (!Icon) {
    return <input className={inputVariants({ className })} {...rest} />;
  }
  return (
    <div className="relative">
      <Icon
        size={16}
        strokeWidth={1.75}
        className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 text-muted"
      />
      <input className={inputVariants({ hasIcon: true, className })} {...rest} />
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={textareaVariants()} {...props} />;
}
