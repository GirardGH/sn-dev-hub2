import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "active"
  | "inactive"
  | "draft"
  | "in_progress"
  | "review"
  | "done"
  | "deployed"
  | "cancelled"
  | "high"
  | "critical"
  | "medium"
  | "low"
  | "success"
  | "warning"
  | "danger";

const variantStyles: Record<BadgeVariant, { badge: string; dot: string }> = {
  default:     { badge: "bg-gray-100 text-gray-600 border-gray-200",       dot: "bg-gray-400" },
  active:      { badge: "bg-sn-success-light text-green-700 border-green-200",  dot: "bg-sn-success" },
  inactive:    { badge: "bg-gray-100 text-gray-500 border-gray-200",       dot: "bg-gray-400" },
  draft:       { badge: "bg-gray-100 text-gray-600 border-gray-200",       dot: "bg-gray-400" },
  in_progress: { badge: "bg-blue-50 text-blue-700 border-blue-200",        dot: "bg-blue-500" },
  review:      { badge: "bg-sn-warning-light text-amber-700 border-amber-200", dot: "bg-sn-warning" },
  done:        { badge: "bg-sn-success-light text-green-700 border-green-200",  dot: "bg-sn-success" },
  deployed:    { badge: "bg-purple-50 text-purple-700 border-purple-200",  dot: "bg-purple-500" },
  cancelled:   { badge: "bg-sn-danger-light text-sn-danger border-red-200",    dot: "bg-sn-danger" },
  high:        { badge: "bg-orange-50 text-orange-700 border-orange-200",  dot: "bg-orange-500" },
  critical:    { badge: "bg-sn-danger-light text-sn-danger border-red-200",    dot: "bg-sn-danger" },
  medium:      { badge: "bg-blue-50 text-blue-700 border-blue-200",        dot: "bg-blue-500" },
  low:         { badge: "bg-gray-100 text-gray-600 border-gray-200",       dot: "bg-gray-400" },
  success:     { badge: "bg-sn-success-light text-green-700 border-green-200",  dot: "bg-sn-success" },
  warning:     { badge: "bg-sn-warning-light text-amber-700 border-amber-200", dot: "bg-sn-warning" },
  danger:      { badge: "bg-sn-danger-light text-sn-danger border-red-200",    dot: "bg-sn-danger" },
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const styles = variantStyles[variant] ?? variantStyles.default;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[11px] font-semibold border tracking-wide",
        styles.badge,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", styles.dot)} />
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant = (status as BadgeVariant) in variantStyles ? (status as BadgeVariant) : "default";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge variant={variant}>{label}</Badge>;
}
