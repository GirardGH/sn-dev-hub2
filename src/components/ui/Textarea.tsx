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
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-sn-text-muted">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "px-2.5 py-2 text-sm bg-white border rounded transition-colors outline-none resize-y min-h-[80px]",
            "placeholder:text-gray-400 text-sn-text",
            error
              ? "border-sn-danger focus:border-sn-danger focus:ring-1 focus:ring-sn-danger"
              : "border-sn-border focus:border-sn-accent focus:ring-1 focus:ring-sn-accent",
            "disabled:bg-gray-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-sn-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-sn-text-muted">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
