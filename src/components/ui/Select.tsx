"use client";
import { useT } from "@/i18n/LanguageProvider";
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
    const t = useT();
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-sn-text">
            {t(label)}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              "h-9 pl-2.5 pr-8 text-[13px] bg-white border rounded-md transition-colors outline-none appearance-none w-full cursor-pointer",
              "text-sn-text",
              error
                ? "border-sn-danger focus:border-sn-danger focus:ring-2 focus:ring-sn-danger/30"
                : "border-sn-border focus:border-sn-accent focus:ring-2 focus:ring-sn-accent/30",
              "disabled:bg-sn-table-header disabled:cursor-not-allowed disabled:text-sn-text-muted",
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
        {error && <p className="text-[11px] text-sn-danger mt-0.5">{t(error)}</p>}
        {hint && !error && <p className="text-[11px] text-sn-text-muted mt-0.5">{t(hint)}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
