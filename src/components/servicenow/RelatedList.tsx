"use client";

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
}: RelatedListProps<T>) {
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

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function toggleSelectAll() {
    if (selected.size === sortedData.length && sortedData.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedData.map((r) => r.id)));
    }
  }

  async function handleBulkDelete() {
    if (!onDeleteSelected) return;
    setDeleting(true);
    try {
      await onDeleteSelected(Array.from(selected));
      setSelected(new Set());
      onRefresh?.();
    } catch (err) {
      toast.error("Erreur lors de la suppression : " + String(err));
    } finally {
      setDeleting(false);
      setConfirmBulkDelete(false);
    }
  }

  return (
    <div className="bg-white border border-sn-border rounded-sm shadow-sm mt-4 overflow-hidden">
      {/* Header — ServiceNow-style blue title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-sn-accent cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 text-white/70 transition-transform",
              !collapsed && "rotate-90"
            )}
          />
          <span className="text-[13px] font-semibold text-white">{title}</span>
          <span className="text-[11px] text-white/60 bg-white/15 rounded-sm px-1.5 py-0.5">
            {data.length}
          </span>
          {selected.size > 0 && (
            <span className="text-[11px] text-white/80 bg-white/20 rounded-sm px-1.5 py-0.5">
              {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {extraActions}
          {/* Refresh / Bulk delete — delete replaces refresh when rows are selected */}
          {onDeleteSelected && selected.size > 0 ? (
            <Button
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setConfirmBulkDelete(true)}
              loading={deleting}
              className="bg-white/20 text-white hover:bg-red-500 border border-white/30 shadow-none font-semibold"
            >
              Supprimer ({selected.size})
            </Button>
          ) : onRefresh ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5 text-white/70" />}
              onClick={onRefresh}
              loading={loading}
              className="hover:bg-white/15 text-white/70 hover:text-white"
            />
          ) : null}
          {onNew && (
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={onNew}
              data-navigation-feedback="true"
              className="bg-white text-sn-accent hover:bg-white/90 border-0 shadow-none font-semibold"
            >
              New
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b-2 border-sn-border bg-sn-table-header">
                {onDeleteSelected && (
                  <th className="w-8 px-3 py-2">
                    <Checkbox
                      checked={selected.size === sortedData.length && sortedData.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-left text-[11px] font-semibold text-sn-text-muted uppercase tracking-wider cursor-pointer hover:text-sn-text select-none"
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
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
                  <td colSpan={visibleCols.length + (onDeleteSelected ? 1 : 0)} className="px-3 py-6 text-center">
                    <Loader2 className="w-4 h-4 animate-spin text-sn-accent mx-auto" />
                  </td>
                </tr>
              )}
              {!loading && sortedData.length === 0 && (
                <tr>
                  <td
                    colSpan={visibleCols.length + (onDeleteSelected ? 1 : 0)}
                    className="px-3 py-4 text-center text-[12px] text-sn-text-muted"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
              {!loading &&
                sortedData.map((row, idx) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    data-navigation-feedback={onRowClick ? "true" : undefined}
                    className={cn(
                      "border-b border-sn-border last:border-0 transition-colors group",
                      idx % 2 === 1 ? "bg-sn-table-stripe" : "bg-white",
                      onRowClick && "cursor-pointer hover:bg-sn-accent-light"
                    )}
                  >
                    {onDeleteSelected && (
                      <td className="w-8 px-3 py-2" onClick={(e) => e.stopPropagation()} data-navigation-feedback="ignore">
                        <div className={cn(
                          "transition-opacity",
                          selected.has(row.id) || selected.size > 0
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        )}>
                          <Checkbox
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
                      <td key={col.key} className="px-3 py-2 text-sn-text">
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
        title="Confirmer la suppression"
        message={`Supprimer ${selected.size} enregistrement${selected.size > 1 ? "s" : ""} ? Cette action est irréversible.`}
      />
    </div>
  );
}
