/** Group rows by a derived key, preserving insertion order within each group. */
export function groupBy<T, K extends string>(rows: T[], key: (row: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const row of rows) {
    const k = key(row);
    (out[k] ??= []).push(row);
  }
  return out;
}

export function sumBy<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + value(row), 0);
}

export function uniqueBy<T, K>(rows: T[], key: (row: T) => K): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const row of rows) {
    const k = key(row);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  return out;
}

export type SortDirection = 'asc' | 'desc';

/** Stable, type-aware comparison used by DataTable column sorting. */
export function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function sortBy<T>(rows: T[], value: (row: T) => unknown, dir: SortDirection = 'asc'): T[] {
  const sorted = [...rows].sort((a, b) => compareValues(value(a), value(b)));
  return dir === 'asc' ? sorted : sorted.reverse();
}

/** Deterministic pick, so seed data is reproducible across reloads. */
export function pick<T>(rows: readonly T[], index: number): T {
  if (rows.length === 0) throw new Error('pick() called on an empty array');
  return rows[((index % rows.length) + rows.length) % rows.length]!;
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function topN<T>(rows: T[], n: number, score: (row: T) => number): T[] {
  return [...rows].sort((a, b) => score(b) - score(a)).slice(0, n);
}
