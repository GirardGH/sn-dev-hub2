export interface CellFilter {
  id: string;
  key: string;
  label: string;
  value: string;
  display: string;
  operator: "is" | "is_not";
}
export function cellValue(value: unknown): string | undefined {
  if (value == null) return "";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value).toLowerCase();
  return undefined;
}
export function contextValue(row: unknown, key: string, fallback: unknown): unknown {
  // A reference is matched by its ID even when two records share a display name.
  const record = row as Record<string, unknown>;
  return Object.prototype.hasOwnProperty.call(record, `${key}_id`) ? record[`${key}_id`] : fallback;
}
export function matchesCellFilters<T>(row: T, filters: CellFilter[], getValue: (row: T, key: string) => unknown) {
  return filters.every(filter => {
    const actual = cellValue(getValue(row, filter.key));
    return filter.operator === "is" ? actual === filter.value : actual !== filter.value;
  });
}
export function addCellFilter(filters: CellFilter[], next: CellFilter) {
  return filters.some(f => f.key === next.key && f.value === next.value && f.operator === next.operator) ? filters : [...filters, next];
}

export type GroupEntry<T> = { kind: "group"; key: string; rows: T[] } | { kind: "row"; row: T };
export function groupedEntries<T>(rows: T[], field: string | undefined, getValue: (row: T, key: string) => unknown, closed: Set<string>): GroupEntry<T>[] {
  if (!field) return rows.map(row => ({kind: "row", row}));
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = cellValue(getValue(row, field)) ?? "";
    const group = groups.get(key);
    if (group) group.push(row); else groups.set(key, [row]);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).flatMap(([key, members]): GroupEntry<T>[] => [
    {kind: "group", key, rows: members},
    ...(closed.has(key) ? [] : members.map(row => ({kind: "row" as const, row})))
  ]);
}
