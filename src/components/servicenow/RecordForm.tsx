"use client";

import { ChevronLeft, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";

interface RecordFormProps {
  title: string;
  subtitle?: string;
  status?: string;
  breadcrumbs?: BreadcrumbItem[];
  onSave?: () => void;
  onDelete?: () => void;
  saving?: boolean;
  deleting?: boolean;
  isNew?: boolean;
  children: React.ReactNode;
  relatedLists?: React.ReactNode;
  createdAt?: string;
  updatedAt?: string;
  backHref?: string;
  wide?: boolean;
}

export function RecordForm({
  title,
  subtitle,
  status,
  breadcrumbs = [],
  onSave,
  onDelete,
  saving,
  deleting,
  isNew,
  children,
  relatedLists,
  createdAt,
  updatedAt,
  backHref,
  wide = false,
}: RecordFormProps) {
  const router = useRouter();

  function handleBack() {
    if (backHref) router.push(backHref);
    else router.back();
  }

  return (
    <div className={wide ? "max-w-none" : "max-w-5xl"}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} className="mb-3" />
      )}

      {/* Record header */}
      <div className="bg-white border border-sn-border rounded shadow-sm mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sn-border">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-sn-text-muted hover:text-sn-text transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-sn-text">{title}</h1>
                {status && <StatusBadge status={status} />}
              </div>
              {subtitle && (
                <p className="text-xs text-sn-text-muted mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isNew && onDelete && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5 text-sn-danger" />}
                onClick={onDelete}
                loading={deleting}
                className="text-sn-danger border-sn-danger/30 hover:bg-sn-danger-light"
              >
                Delete
              </Button>
            )}
            {onSave && (
              <Button
                size="sm"
                icon={<Save className="w-3.5 h-3.5" />}
                onClick={onSave}
                loading={saving}
              >
                {isNew ? "Create" : "Save"}
              </Button>
            )}
          </div>
        </div>

        {/* Form body */}
        <div className="p-4">{children}</div>

        {/* Timestamps */}
        {(createdAt || updatedAt) && (
          <div className="px-4 py-2 border-t border-sn-border bg-gray-50 flex gap-4 text-2xs text-sn-text-muted">
            {createdAt && <span>Created: {formatDateTime(createdAt)}</span>}
            {updatedAt && <span>Updated: {formatDateTime(updatedAt)}</span>}
          </div>
        )}
      </div>

      {/* Related lists */}
      {relatedLists && <div>{relatedLists}</div>}
    </div>
  );
}

interface FormSectionProps {
  title?: string;
  columns?: 1 | 2;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, columns = 2, children, className }: FormSectionProps) {
  return (
    <div className={cn("mb-4", className)}>
      {title && (
        <h3 className="text-xs font-semibold text-sn-text-muted uppercase tracking-wide mb-3 pb-1.5 border-b border-sn-border">
          {title}
        </h3>
      )}
      <div
        className={cn(
          "grid gap-4",
          columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function FullWidthField({ children }: { children: React.ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}
