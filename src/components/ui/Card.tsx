import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}

export function Card({ children, className, title, actions }: CardProps) {
  return (
    <div className={cn("bg-white border border-sn-border rounded-sm shadow-xs", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-sn-border">
          {title && <h3 className="text-sm font-semibold text-sn-text">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
