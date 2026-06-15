"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  RefreshCw,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FilterBuilder, type FilterCondition, type FilterField } from "./FilterBuilder";
import { ColumnConfigurator, type ColumnDef } from "./ColumnConfigurator";
import { cn } from "@/lib/utils";

export interface ListColumn<T> extends ColumnDef {
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface ServiceNowListProps<T extends { id: string }> {
  title: string;
  data: T[];
  columns: ListColumn<T>[];
  onColumnsChange?: (columns: ColumnDef[]) => void;
  onRowClick?: (row: T) => void;
  onNew?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  filterFields?: FilterField[];
  newLabel?: string;
  extraActions?: React.ReactNode;
  emptyMessage?: string;
}

export function ServiceNowList<T extends { id: string }>({
  title,
  data,
  columns,
  onColumnsChange,
  onRowClick,
  onNew,
  onRefresh,
  loading,
  filterFields = [],
  newLabel = "New",
  extraActions,
  emptyMessage = "No records found.",
}: ServiceNowListProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterCondition[]>([]);

  const visibleColumns = useMemo(
    () =>
      [...columns]
        .filter((c) => c.visible)
        .sort((a, b) => a.order - b.order),
    [columns]
  );

  const applyFilter = useCallback(
    (row: T, conditions: FilterCondition[]): boolean => {
      return conditions.every((cond) => {
        const cellValue = String((row as Record<string, unknown>)[cond.field] ?? "").toLowerCase();
        const filterValue = cond.value.toLowerCase();
        switch (cond.operator) {
          case "is": return cellValue === filterValue;
          case "is_not": return cellValue !== filterValue;
          case "contains": return cellValue.includes(filterValue);
          case "starts_with": return cellValue.startsWith(filterValue);
          case "is_empty": return cellValue === "";
          case "is_not_empty": return cellValue !== "";
          default: return true;
        }
      });
    },
    []
  );

  const filteredData = useMemo(() => {
    let result = data;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }

    if (activeFilters.length > 0) {
      result = result.filter((row) => applyFilter(row, activeFilters));
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = String((a as Record<string, unknown>)[sortKey] ?? "");
        const bVal = String((b as Record<string, unknown>)[sortKey] ?? "");
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }

    return result;
  }, [data, search, activeFilters, sortKey, sortDir, applyFilter]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleSelectAll() {
    if (selected.size === filteredData.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredData.map((r) => r.id)));
    }
  }

  function exportCsv() {
    const headers = visibleColumns.map((c) => c.label).join(",");
    const rows = filteredData.map((row) =>
      visibleColumns
        .map((col) => {
          const val = (row as Record<string, unknown>)[col.key];
          return `"${String(val ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white border border-sn-border rounded shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-sn-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-sn-text">{title}</span>
          <span className="text-xs text-sn-text-muted">
            ({filteredData.length} of {data.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sn-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-7 pl-7 pr-2.5 text-xs bg-white border border-sn-border rounded outline-none focus:border-sn-accent focus:ring-1 focus:ring-sn-accent w-48"
            />
          </div>

          {/* Filter */}
          {filterFields.length > 0 && (
            <FilterBuilder
              fields={filterFields}
              conditions={filterConditions}
              onChange={setFilterConditions}
              onApply={() => setActiveFilters([...filterConditions])}
              onClear={() => { setFilterConditions([]); setActiveFilters([]); }}
            />
          )}

          {/* Columns */}
          {onColumnsChange && (
            <ColumnConfigurator
              columns={columns}
              onChange={onColumnsChange}
            />
          )}

          {/* Export */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={exportCsv}
            title="Export CSV"
          />

          {/* Refresh */}
          {onRefresh && (
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={onRefresh}
              loading={loading}
              title="Refresh"
            />
          )}

          {/* Extra */}
          {extraActions}

          {/* New */}
          {onNew && (
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={onNew}
            >
              {newLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-sn-border">
              <th className="w-8 px-3 py-2">
                <Checkbox
                  checked={selected.size === filteredData.length && filteredData.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2 text-left text-xs font-semibold text-sn-text-muted uppercase tracking-wide",
                    col.sortable !== false && "cursor-pointer hover:text-sn-text select-none"
                  )}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false &&
                      (sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-40" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-3 py-8 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-sn-accent mx-auto" />
                </td>
              </tr>
            )}
            {!loading && filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-3 py-8 text-center text-sm text-sn-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!loading &&
              filteredData.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-sn-border last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-sn-accent-light"
                  )}
                >
                  <td className="w-8 px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(row.id)}
                      onChange={() => {
                        const next = new Set(selected);
                        if (next.has(row.id)) { next.delete(row.id); } else { next.add(row.id); }
                        setSelected(next);
                      }}
                    />
                  </td>
                  {visibleColumns.map((col) => (
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
    </div>
  );
}
