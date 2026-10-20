"use client";
import { useSpace } from "@/features/spaces/SpaceProvider";
import { canWrite, canDelete } from "@/features/spaces/space.types";
import { useT } from "@/i18n/LanguageProvider";

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
  headerActions?: React.ReactNode;
  attachmentStrip?: React.ReactNode;
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
  headerActions,
  attachmentStrip,
}: RecordFormProps) {
  const t = useT();
  const space = useSpace();
  const writable = space ? canWrite(space.active.role) : true;
  const removable = space ? canDelete(space.active.role) : true;
  const router = useRouter();

  function handleBack() {
    if (backHref) router.push(backHref);
    else router.back();
  }

  return (
    <div className={cn(wide ? "max-w-none" : "max-w-6xl", "workspace-record min-h-0 flex flex-col")}>
      <div className="pt-1 pb-0 bg-sn-bg flex-shrink-0">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="pb-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}

      {/* Record panel */}
      <div className="bg-white border border-sn-border rounded-t-xl shadow-sm overflow-hidden">
        {/* Record header bar — dark like SN */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 bg-white border-b border-sn-border gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              aria-label={t("Revenir à la liste")}
              onClick={handleBack}
              data-navigation-feedback="true"
              className="w-8 h-8 flex items-center justify-center rounded-md border border-sn-border text-sn-text-muted hover:text-sn-accent hover:bg-sn-accent-light transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-sn-text leading-tight">{title}</h1>
                {status && <StatusBadge status={status} />}
              </div>
              {subtitle && (
                <p className="text-xs text-sn-text-muted mt-1">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {headerActions}
            {!isNew && removable && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5 text-sn-danger" />}
                onClick={onDelete}
                loading={deleting}
                className="text-sn-danger hover:bg-red-50 hover:text-red-700"
              >
                {t("Supprimer")}</Button>
            )}
            {writable && onSave && (
              <Button
                size="sm"
                icon={<Save className="w-3.5 h-3.5" />}
                onClick={onSave}
                loading={saving}
                className="bg-sn-accent hover:bg-sn-accent-hover text-white border-0 shadow-none"
              >
                {isNew ? t("Créer") : t("Enregistrer")}
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
      {/* Record panel */}
      <div className="bg-white border border-sn-border border-t-0 rounded-b-xl shadow-sm mb-4 overflow-hidden">

        {attachmentStrip}
        {/* Form body */}
        <fieldset disabled={!writable} className="p-5 sm:p-6 min-w-0">{!writable && <p className="text-xs text-sn-text-muted mb-4">{t("Read-only space")}</p>}{children}</fieldset>

        {/* Timestamps */}
        {(createdAt || updatedAt) && (
          <div className="px-4 py-1.5 border-t border-sn-border bg-sn-table-header flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-sn-text-muted">
            {createdAt && <span>{t("Created:")}{formatDateTime(createdAt)}</span>}
            {updatedAt && <span>{t("Updated:")}{formatDateTime(updatedAt)}</span>}
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
          <span className="text-sm font-semibold text-sn-text whitespace-nowrap">
            {title}
          </span>
          <div className="flex-1 h-px bg-sn-border" />
        </div>
      )}
      <div
        className={cn(
          "grid gap-5",
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
