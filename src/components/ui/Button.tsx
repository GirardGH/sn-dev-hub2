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
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 font-medium rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sn-accent focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed select-none",
          {
            "bg-sn-accent text-white hover:bg-sn-accent-hover active:scale-[0.98]":
              variant === "primary",
            "bg-white text-sn-text border border-sn-border hover:bg-gray-50 active:bg-gray-100":
              variant === "secondary",
            "bg-sn-danger text-white hover:bg-red-700": variant === "danger",
            "text-sn-text hover:bg-gray-100": variant === "ghost",
            "text-sn-accent hover:underline p-0 h-auto": variant === "link",
          },
          {
            "h-7 px-2.5 text-xs": size === "sm",
            "h-8 px-3 text-sm": size === "md",
            "h-10 px-4 text-sm": size === "lg",
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
