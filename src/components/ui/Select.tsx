import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-sn-text-muted">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              "h-8 pl-2.5 pr-8 text-sm bg-white border rounded transition-colors outline-none appearance-none w-full",
              "text-sn-text",
              error
                ? "border-sn-danger focus:border-sn-danger focus:ring-1 focus:ring-sn-danger"
                : "border-sn-border focus:border-sn-accent focus:ring-1 focus:ring-sn-accent",
              "disabled:bg-gray-50 disabled:cursor-not-allowed",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sn-text-muted pointer-events-none" />
        </div>
        {error && <p className="text-xs text-sn-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-sn-text-muted">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
