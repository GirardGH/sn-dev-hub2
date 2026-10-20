"use client";
import { useSpace } from "@/features/spaces/SpaceProvider";
import { CopyToSpace } from "@/features/spaces/CopyToSpace";
import { canWrite, canDelete, type CopyKind } from "@/features/spaces/space.types";
import { useT } from "@/i18n/LanguageProvider";

import { useState, useMemo } from "react";
import {
  Plus,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

export interface RelatedColumn<T> {
  key: string;
  label: string;
  visible?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface RelatedListProps<T extends { id: string }> {
  title: string;
  data: T[];
  columns: RelatedColumn<T>[];
  onRowClick?: (row: T) => void;
  onNew?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  extraActions?: React.ReactNode;
  emptyMessage?: string;
  defaultCollapsed?: boolean;
  onDeleteSelected?: (ids: string[]) => Promise<void>;
  copyKind?: CopyKind;
}

export function RelatedList<T extends { id: string }>({
  title,
  data,
  columns,
  onRowClick,
  onNew,
  onRefresh,
  loading,
  extraActions,
  emptyMessage = "No records.",
  defaultCollapsed = false,
  onDeleteSelected,
  copyKind,
}: RelatedListProps<T>) {
  const t = useT();
  const space = useSpace();
  const writable = space ? canWrite(space.active.role) : true;
  const removable = space ? canDelete(space.active.role) : true;
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const visibleCols = useMemo(() => columns.filter((c) => c.visible !== false), [columns]);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [data, sortKey, sortDir]);

  const copyable = !!copyKind && !!space?.spaces.some(target => target.id !== space.active.id && canWrite(target.role));
  const selectable = copyable || (removable && !!onDeleteSelected);
  const selectedIds = sortedData.filter(row => selected.has(row.id)).map(row => row.id);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function toggleSelectAll() {
    if (selectedIds.length === sortedData.length && sortedData.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedData.map((r) => r.id)));
    }
  }

  async function handleBulkDelete() {
    if (!onDeleteSelected) return;
    setDeleting(true);
    try {
      await onDeleteSelected(selectedIds);
      setSelected(new Set());
      onRefresh?.();
    } catch (err) {
      toast.error(t("Erreur lors de la suppression : ") + String(err));
    } finally {
      setDeleting(false);
      setConfirmBulkDelete(false);
    }
  }

  return (
    <div className="workspace-card mt-5 overflow-hidden">
      {/* Header — ServiceNow-style blue title bar */}
      <div
        className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-sn-table-header border-b border-sn-border cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 text-sn-text-muted transition-transform",
              !collapsed && "rotate-90"
            )}
          />
          <span className="text-[13px] font-semibold text-sn-text">{title}</span>
          <span className="text-[11px] text-sn-text-muted bg-white rounded-md px-1.5 py-0.5">
            {data.length}
          </span>
          {selectedIds.length > 0 && (
            <span className="text-[11px] text-sn-accent bg-sn-accent-light rounded-md px-1.5 py-0.5">
              {selectedIds.length} {t("sélectionné")}{selectedIds.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
          {extraActions}
          {copyable && copyKind && selectedIds.length > 0 && <CopyToSpace kind={copyKind} ids={selectedIds} />}
          {/* Refresh / Bulk delete — delete replaces refresh when rows are selected */}
          {removable && onDeleteSelected && selectedIds.length > 0 ? (
            <Button
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setConfirmBulkDelete(true)}
              loading={deleting}
              className="bg-red-50 text-sn-danger hover:bg-red-100 border border-red-200 shadow-none font-semibold"
            >
              {t("Supprimer (")}{selectedIds.length})
            </Button>
          ) : onRefresh ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5 text-sn-text-muted" />}
              onClick={onRefresh}
              loading={loading}
              className="hover:bg-sn-accent-light text-sn-text-muted hover:text-sn-accent"
            />
          ) : null}
          {writable && onNew && (
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={onNew}
              data-navigation-feedback="true"
              className="bg-sn-accent text-white hover:bg-sn-accent-hover border-0 shadow-none font-semibold"
            >
              {t("New")}</Button>
          )}
        </div>
      </div>

      {/* Table */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-sn-border bg-sn-table-header">
                {selectable && (
                  <th className="w-8 px-4 py-3">
                    <Checkbox
                      aria-label={t("Select all visible records")}
                      checked={selectedIds.length === sortedData.length && sortedData.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-[11px] font-semibold text-sn-text-muted uppercase tracking-wider cursor-pointer hover:text-sn-text select-none"
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {t(col.label)}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-3 h-3 text-sn-accent" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-sn-accent" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={visibleCols.length + (selectable ? 1 : 0)} className="px-3 py-6 text-center">
                    <Loader2 className="w-4 h-4 animate-spin text-sn-accent mx-auto" />
                  </td>
                </tr>
              )}
              {!loading && sortedData.length === 0 && (
                <tr>
                  <td
                    colSpan={visibleCols.length + (selectable ? 1 : 0)}
                    className="px-3 py-4 text-center text-[12px] text-sn-text-muted"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
              {!loading &&
                sortedData.map((row) => (
                  <tr
                    key={row.id}
                    data-selected={selected.has(row.id) ? "true" : undefined}
                    onClick={() => onRowClick?.(row)}
                    data-navigation-feedback={onRowClick ? "true" : undefined}
                    className={cn(
                      "sn-list-row border-b border-sn-border last:border-0 transition-colors group",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {selectable && (
                      <td className="w-8 px-4 py-3" onClick={(e) => e.stopPropagation()} data-navigation-feedback="ignore">
                        <div className={cn(
                          "transition-opacity",
                          selected.has(row.id) || selectedIds.length > 0
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        )}>
                          <Checkbox
                            aria-label={t("Select record {id}", {id: row.id})}
                            checked={selected.has(row.id)}
                            onChange={() => {
                              const next = new Set(selected);
                              if (next.has(row.id)) { next.delete(row.id); } else { next.add(row.id); }
                              setSelected(next);
                            }}
                          />
                        </div>
                      </td>
                    )}
                    {visibleCols.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sn-text">
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        loading={deleting}
        title={t("Confirmer la suppression")}
        message={t("Delete {count} records? This action cannot be undone.", { count: selectedIds.length })}
      />
    </div>
  );
}
