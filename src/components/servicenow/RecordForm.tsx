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
    <div className={cn(wide ? "max-w-none" : "max-w-5xl", "h-[calc(100vh-5rem)] min-h-0 flex flex-col")}>
      <div className="-mx-4 px-4 pt-1 pb-0 bg-sn-bg flex-shrink-0">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="pb-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}

      {/* Record panel */}
      <div className="bg-white border border-sn-border rounded-t-sm shadow-sm overflow-hidden">
        {/* Record header bar — dark like SN */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-sn-header border-b border-black/20">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-white/60 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[14px] font-semibold text-white leading-tight">{title}</h1>
                {status && <StatusBadge status={status} />}
              </div>
              {subtitle && (
                <p className="text-[11px] text-white/50 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isNew && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
                onClick={onDelete}
                loading={deleting}
                className="text-red-400 hover:bg-white/10 hover:text-red-300"
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
                className="bg-sn-accent hover:bg-sn-accent-hover text-white border-0 shadow-none"
              >
                {isNew ? "Create" : "Update"}
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
      {/* Record panel */}
      <div className="bg-white border border-sn-border border-t-0 rounded-b-sm shadow-sm mb-4 overflow-hidden">

        {/* Form body */}
        <div className="p-4">{children}</div>

        {/* Timestamps */}
        {(createdAt || updatedAt) && (
          <div className="px-4 py-1.5 border-t border-sn-border bg-sn-table-header flex gap-6 text-[11px] text-sn-text-muted">
            {createdAt && <span>Created: {formatDateTime(createdAt)}</span>}
            {updatedAt && <span>Updated: {formatDateTime(updatedAt)}</span>}
          </div>
        )}
      </div>

      {/* Related lists */}
      {relatedLists && <div>{relatedLists}</div>}
      </div>
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
    <div className={cn("mb-5", className)}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold text-sn-text-muted uppercase tracking-widest whitespace-nowrap">
            {title}
          </span>
          <div className="flex-1 h-px bg-sn-border" />
        </div>
      )}
      <div
        className={cn(
          "grid gap-3",
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
