import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <label
        htmlFor={inputId}
        className="inline-flex items-center gap-2 cursor-pointer group"
      >
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={cn(
            "w-3.5 h-3.5 rounded border-sn-border text-sn-accent accent-sn-accent",
            className
          )}
          {...props}
        />
        {label && (
          <span className="text-sm text-sn-text group-hover:text-sn-accent transition-colors">
            {label}
          </span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
