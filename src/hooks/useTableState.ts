import { useMemo, useState } from 'react';
import { compareValues, type SortDirection } from '@/utils/array';

export interface TableState<T> {
  page: number;
  pageSize: number;
  sortKey: string | null;
  sortDir: SortDirection;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  toggleSort: (key: string) => void;
  /** Rows for the current page, already sorted. */
  rows: T[];
  /** Every row after sorting, before pagination — used for exports. */
  sortedRows: T[];
  total: number;
  pageCount: number;
  from: number;
  to: number;
}

export interface TableStateOptions<T> {
  /** Maps a sort key to the value to compare. Falls back to `row[key]`. */
  accessors?: Record<string, (row: T) => unknown>;
  initialSortKey?: string;
  initialSortDir?: SortDirection;
  initialPageSize?: number;
}

/**
 * Sorting and pagination for a list that is already filtered. Resetting to page
 * one when the result set shrinks is handled here, so a filter can never leave
 * the table stranded on an empty page.
 */
export function useTableState<T extends object>(
  data: T[],
  options: TableStateOptions<T> = {},
): TableState<T> {
  const {
    accessors = {},
    initialSortKey = null,
    initialSortDir = 'asc',
    initialPageSize = 10,
  } = options;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey);
  const [sortDir, setSortDir] = useState<SortDirection>(initialSortDir);

  const sortedRows = useMemo(() => {
    if (!sortKey) return data;
    const accessor = accessors[sortKey] ?? ((row: T) => (row as Record<string, unknown>)[sortKey]);
    const sorted = [...data].sort((a, b) => compareValues(accessor(a), accessor(b)));
    return sortDir === 'asc' ? sorted : sorted.reverse();
    // `accessors` is a fresh object each render; key off the sort key instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sortKey, sortDir]);

  const total = sortedRows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  const rows = useMemo(
    () => sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sortedRows, safePage, pageSize],
  );

  const toggleSort = (key: string): void => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  return {
    page: safePage,
    pageSize,
    sortKey,
    sortDir,
    setPage,
    setPageSize: (size) => {
      setPageSize(size);
      setPage(1);
    },
    toggleSort,
    rows,
    sortedRows,
    total,
    pageCount,
    from: total === 0 ? 0 : (safePage - 1) * pageSize + 1,
    to: Math.min(safePage * pageSize, total),
  };
}
