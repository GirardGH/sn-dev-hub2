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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
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
}: RelatedListProps<T>) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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

  return (
    <div className="bg-white border border-sn-border rounded shadow-sm mt-4">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-sn-border cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 text-sn-text-muted transition-transform",
              !collapsed && "rotate-90"
            )}
          />
          <span className="text-sm font-semibold text-sn-text">{title}</span>
          <span className="text-xs text-sn-text-muted">({data.length})</span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {extraActions}
          {onRefresh && (
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={onRefresh}
              loading={loading}
            />
          )}
          {onNew && (
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={onNew}
            >
              New
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sn-border">
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2 text-left text-xs font-semibold text-sn-text-muted uppercase tracking-wide cursor-pointer hover:text-sn-text select-none"
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={visibleCols.length} className="px-3 py-6 text-center">
                    <Loader2 className="w-4 h-4 animate-spin text-sn-accent mx-auto" />
                  </td>
                </tr>
              )}
              {!loading && sortedData.length === 0 && (
                <tr>
                  <td
                    colSpan={visibleCols.length}
                    className="px-3 py-4 text-center text-xs text-sn-text-muted"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
              {!loading &&
                sortedData.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-b border-sn-border last:border-0 transition-colors",
                      onRowClick && "cursor-pointer hover:bg-sn-accent-light"
                    )}
                  >
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
    </div>
  );
}
