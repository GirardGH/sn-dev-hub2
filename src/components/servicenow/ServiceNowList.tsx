"use client";
import { useCellFilters } from "./CellContextMenu";
import { contextValue, matchesCellFilters } from "./cellFilters";
import { useSpace } from "@/features/spaces/SpaceProvider";
import { CopyToSpace } from "@/features/spaces/CopyToSpace";
import { canWrite, canDelete, type CopyKind } from "@/features/spaces/space.types";
import { useT } from "@/i18n/LanguageProvider";

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
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FilterBuilder, type FilterCondition, type FilterField } from "./FilterBuilder";
import { ColumnConfigurator, type ColumnDef } from "./ColumnConfigurator";
import { csvCell } from "@/lib/csv";
import { cn } from "@/lib/utils";

export interface ListColumn<T> extends ColumnDef {
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  getValue?: (row: T) => unknown;
}

type ListFilterField<T> = FilterField & {
  getValue?: (row: T) => unknown;
};

interface ServiceNowListProps<T extends { id: string }> {
  title: string;
  data: T[];
  columns: ListColumn<T>[];
  onColumnsChange?: (columns: ColumnDef[]) => void;
  onRowClick?: (row: T) => void;
  onNew?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  filterFields?: ListFilterField<T>[];
  newLabel?: string;
  extraActions?: React.ReactNode;
  emptyMessage?: string;
  onDeleteSelected?: (ids: string[]) => Promise<void>;
  copyKind?: CopyKind;
  className?: string;
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
  onDeleteSelected,
  copyKind,
  className,
}: ServiceNowListProps<T>) {
  const t = useT();
  const cellFilters = useCellFilters();
  const space = useSpace();
  const writable = space ? canWrite(space.active.role) : true;
  const removable = space ? canDelete(space.active.role) : true;
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterCondition[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const visibleColumns = useMemo(
    () =>
      [...columns]
        .filter((c) => c.visible)
        .sort((a, b) => a.order - b.order),
    [columns]
  );

  const getRawValue = useCallback((row: T, key: string): unknown => {
    return (row as Record<string, unknown>)[key];
  }, []);

  const getColumnValue = useCallback((row: T, key: string): unknown => {
    const column = columns.find((col) => col.key === key);
    return column?.getValue ? column.getValue(row) : getRawValue(row, key);
  }, [columns, getRawValue]);

  const getFilterValue = useCallback((row: T, field: ListFilterField<T>): unknown => {
    return field.getValue ? field.getValue(row) : getColumnValue(row, field.key);
  }, [getColumnValue]);

  const getCellMatchValue = useCallback((row: T, key: string) => {
    const field = filterFields.find(f => f.key === key);
    return contextValue(row, key, field ? getFilterValue(row, field) : getColumnValue(row, key));
  }, [filterFields, getFilterValue, getColumnValue]);

  const applyFilter = useCallback(
    (row: T, conditions: FilterCondition[]): boolean => {
      const matchesCondition = (cond: FilterCondition): boolean => {
        const fieldDef = filterFields.find((field) => field.key === cond.field);
        const rawValue = fieldDef ? getFilterValue(row, fieldDef) : getColumnValue(row, cond.field);
        const cellValue = String(rawValue ?? "").toLowerCase();
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
      };

      return conditions.reduce((result, cond, index) => {
        const matched = matchesCondition(cond);
        if (index === 0) return matched;
        return (cond.connector ?? "and") === "or" ? result || matched : result && matched;
      }, true);
    },
    [filterFields, getColumnValue, getFilterValue]
  );

  const filteredData = useMemo(() => {
    let result = data.filter(row => matchesCellFilters(row, cellFilters.filters, getCellMatchValue));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        [...visibleColumns.map((col) => getColumnValue(row, col.key)), ...filterFields.map((field) => getFilterValue(row, field))]
          .some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }
    if (activeFilters.length > 0) {
      result = result.filter((row) => applyFilter(row, activeFilters));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = String(getColumnValue(a, sortKey) ?? "");
        const bVal = String(getColumnValue(b, sortKey) ?? "");
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }
    return result;
  }, [data, cellFilters.filters, getCellMatchValue, search, activeFilters, sortKey, sortDir, applyFilter, visibleColumns, filterFields, getColumnValue, getFilterValue]);

  const copyable = !!copyKind && !!space?.spaces.some(target => target.id !== space.active.id && canWrite(target.role));
  const selectable = copyable || (removable && !!onDeleteSelected);
  const selectedIds = filteredData.filter(row => selected.has(row.id)).map(row => row.id);

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

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function toggleSelectAll() {
    if (selectedIds.length === filteredData.length) setSelected(new Set());
    else setSelected(new Set(filteredData.map((r) => r.id)));
  }

  function exportCsv() {
    const headers = visibleColumns.map((c) => csvCell(t(c.label))).join(",");
    const rows = filteredData.map((row) =>
      visibleColumns
        .map((col) => {
          const val = col.getValue ? col.getValue(row) : (row as Record<string, unknown>)[col.key];
          return csvCell(val);
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
    <div className={cn("workspace-card overflow-hidden flex flex-col min-h-0", className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-b border-sn-border bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-sn-text">{title}</span>
          <span className="text-[11px] text-sn-text-muted bg-white border border-sn-border rounded-md px-1.5 py-0.5 font-medium">
            {filteredData.length}
            {filteredData.length !== data.length && ` / ${data.length}`}
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sn-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("Rechercher dans la liste")}
              placeholder={t("Rechercher dans la liste…")}
              className="h-8 pl-7 pr-2.5 text-xs bg-white border border-sn-border rounded-md outline-hidden focus:border-sn-accent focus:ring-1 focus:ring-sn-accent/30 w-48 sm:w-56 placeholder:text-sn-border-dark"
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
            <ColumnConfigurator columns={columns} onChange={onColumnsChange} />
          )}

          {/* Export */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={exportCsv}
            title={t("Exporter en CSV")}
            aria-label={t("Exporter en CSV")}
          />

          {/* Refresh / Bulk delete — delete replaces refresh when rows are selected */}
          {removable && onDeleteSelected && selectedIds.length > 0 ? (
            <Button
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setConfirmBulkDelete(true)}
              loading={deleting}
              className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 shadow-xs"
            >
              {t("Supprimer (")}{selectedIds.length})
            </Button>
          ) : onRefresh ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={onRefresh}
              loading={loading}
              title={t("Actualiser")}
              aria-label={t("Actualiser")}
            />
          ) : null}

          {/* Extra */}
          {extraActions}
          {copyable && copyKind && selectedIds.length > 0 && <CopyToSpace kind={copyKind} ids={selectedIds} />}

          {/* New */}
          {writable && onNew && (
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={onNew}
              data-navigation-feedback="true"
            >
              {newLabel}
            </Button>
          )}
        </div>
      </div>

      {cellFilters.ui}

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-sn-border bg-sn-table-header">
              {selectable && <th className="w-8 px-4 py-3">
                <Checkbox
                  aria-label={t("Select all visible records")}
                      checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>}
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-[11px] font-semibold text-sn-text-muted uppercase tracking-wider",
                    col.sortable !== false && "cursor-pointer hover:text-sn-text select-none"
                  )}
                  tabIndex={col.sortable !== false ? 0 : undefined}
                  aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  onKeyDown={(event) => { if (col.sortable !== false && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); toggleSort(col.key); } }}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {t(col.label)}
                    {col.sortable !== false &&
                      (sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-3 h-3 text-sn-accent" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-sn-accent" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-30" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="px-3 py-8 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-sn-accent mx-auto" />
                </td>
              </tr>
            )}
            {!loading && filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  className="px-3 py-8 text-center text-[13px] text-sn-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!loading &&
              filteredData.map((row) => (
                <tr
                  key={row.id}
                    data-selected={selected.has(row.id) ? "true" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(event) => { if (event.key === "Enter" && event.target === event.currentTarget) onRowClick?.(row); }}
                  onClick={() => onRowClick?.(row)}
                  data-navigation-feedback={onRowClick ? "true" : undefined}
                  className={cn(
                    "sn-list-row border-b border-sn-border last:border-0 transition-colors group",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {selectable && <td className="w-8 px-4 py-3" onClick={(e) => e.stopPropagation()} data-navigation-feedback="ignore">
                    <div className={cn(
                      "transition-opacity",
                      selected.has(row.id) || selectedIds.length > 0
                        ? "opacity-100"
                        : "opacity-60 group-hover:opacity-100 group-focus-within:opacity-100"
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
                  </td>}
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sn-text" tabIndex={0} aria-haspopup="menu"
                      onContextMenu={event => cellFilters.open(event, { key: col.key, label: col.label, value: getCellMatchValue(row, col.key), display: event.currentTarget.textContent?.trim() ?? "" })}
                      onKeyDown={event => { if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) cellFilters.open(event, { key: col.key, label: col.label, value: getCellMatchValue(row, col.key), display: event.currentTarget.textContent?.trim() ?? "" }); }}
                    >
                      {col.render
                        ? col.render(row)
                        : String(getColumnValue(row, col.key) ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

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
