import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

interface SortableTableOptions<T> {
  data: T[];
  initialSortColumn?: string;
  initialSortDirection?: SortDirection;
}

interface SortableTableResult<T> {
  sortedData: T[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  setSortColumn: (column: string) => void;
  getSortIndicator: (column: string) => string;
}

export function useSortableTable<T extends Record<string, any>>({
  data,
  initialSortColumn,
  initialSortDirection = "asc",
}: SortableTableOptions<T>): SortableTableResult<T> {
  const [sortState, setSortState] = useState<SortState>({
    column: initialSortColumn || null,
    direction: initialSortDirection,
  });

  const sortedData = useMemo(() => {
    if (!sortState.column) return data;

    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortState.column!];
      const bVal = b[sortState.column!];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Handle string comparison (case-insensitive)
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortState.direction === "asc"
          ? aVal.localeCompare(bVal, undefined, { numeric: true })
          : bVal.localeCompare(aVal, undefined, { numeric: true });
      }

      // Handle number comparison
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortState.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Fallback string comparison
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortState.direction === "asc"
        ? aStr.localeCompare(bStr, undefined, { numeric: true })
        : bStr.localeCompare(aStr, undefined, { numeric: true });
    });

    return sorted;
  }, [data, sortState]);

  const setSortColumn = (column: string) => {
    setSortState((prev) => {
      // If clicking the same column, toggle direction
      if (prev.column === column) {
        return {
          column,
          direction:
            prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc",
        };
      }
      // If clicking a new column, sort ascending
      return {
        column,
        direction: "asc",
      };
    });
  };

  const getSortIndicator = (column: string): string => {
    if (sortState.column !== column) return "";
    if (sortState.direction === "asc") return " ↑";
    if (sortState.direction === "desc") return " ↓";
    return "";
  };

  return {
    sortedData,
    sortColumn: sortState.column,
    sortDirection: sortState.direction,
    setSortColumn,
    getSortIndicator,
  };
}
