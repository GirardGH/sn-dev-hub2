import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-0.5">
        {label && (
          <label htmlFor={inputId} className="text-[11px] font-semibold text-sn-text-muted uppercase tracking-wide">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "px-2.5 py-2 text-[13px] bg-white border rounded-sm transition-colors outline-none resize-y min-h-[72px]",
            "placeholder:text-sn-border-dark text-sn-text",
            error
              ? "border-sn-danger focus:border-sn-danger focus:ring-1 focus:ring-sn-danger/30"
              : "border-sn-border focus:border-sn-accent focus:ring-1 focus:ring-sn-accent/30",
            "disabled:bg-sn-table-header disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-sn-danger mt-0.5">{error}</p>}
        {hint && !error && <p className="text-[11px] text-sn-text-muted mt-0.5">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
