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

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  draft: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
  deployed: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-600",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-600",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium",
        variantStyles[variant] ?? variantStyles.default,
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant = (status as BadgeVariant) in variantStyles ? (status as BadgeVariant) : "default";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge variant={variant}>{label}</Badge>;
}
