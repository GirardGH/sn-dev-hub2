import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, icon, children, disabled, ...props }, ref) => {
    const iconOnly = !children;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 border font-semibold rounded-[3px] transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sn-accent/35 focus-visible:ring-offset-1 active:translate-y-px disabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer",
          {
            "border-sn-accent bg-sn-accent text-white shadow-[0_1px_2px_rgba(6,97,197,0.24)] hover:border-sn-accent-hover hover:bg-sn-accent-hover hover:shadow-[0_2px_5px_rgba(6,97,197,0.28)]":
              variant === "primary",
            "border-sn-border bg-white text-sn-text shadow-[0_1px_2px_rgba(21,31,43,0.06)] hover:border-sn-accent/50 hover:bg-[#f8fbff] hover:text-sn-accent hover:shadow-[0_2px_5px_rgba(21,31,43,0.10)]":
              variant === "secondary",
            "border-sn-danger bg-sn-danger text-white shadow-[0_1px_2px_rgba(196,43,41,0.22)] hover:border-[#a92321] hover:bg-[#a92321] hover:shadow-[0_2px_5px_rgba(196,43,41,0.26)]": variant === "danger",
            "border-transparent bg-transparent text-sn-text shadow-none hover:bg-sn-table-header hover:text-sn-accent": variant === "ghost",
            "h-auto border-transparent bg-transparent p-0 text-sn-accent shadow-none hover:underline font-medium active:translate-y-0": variant === "link",
          },
          {
            "h-7 px-2.5 text-xs tracking-wide": size === "sm",
            "h-8 px-3 text-sm": size === "md",
            "h-9 px-4 text-sm": size === "lg",
          },
          iconOnly && variant !== "link" && {
            "w-7 px-0": size === "sm",
            "w-8 px-0": size === "md",
            "w-9 px-0": size === "lg",
          },
          variant !== "link" && "whitespace-nowrap",
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          icon && <span className="flex-shrink-0">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
