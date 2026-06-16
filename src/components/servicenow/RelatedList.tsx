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
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {extraActions}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5 text-white/70" />}
              onClick={onRefresh}
              loading={loading}
              className="hover:bg-white/15 text-white/70 hover:text-white"
            />
          )}
          {onNew && (
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={onNew}
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
                  <td colSpan={visibleCols.length} className="px-3 py-6 text-center">
                    <Loader2 className="w-4 h-4 animate-spin text-sn-accent mx-auto" />
                  </td>
                </tr>
              )}
              {!loading && sortedData.length === 0 && (
                <tr>
                  <td
                    colSpan={visibleCols.length}
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
                    className={cn(
                      "border-b border-sn-border last:border-0 transition-colors",
                      idx % 2 === 1 ? "bg-sn-table-stripe" : "bg-white",
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
