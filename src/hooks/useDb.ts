import { useDataStore } from '@/store/dataStore';
import type { Database } from '@/mock/seed';

/**
 * Subscribes a component to the whole database.
 *
 * Reading through this hook is what makes the app feel joined-up: a sale taken
 * on the billing screen re-renders the dashboard, the customer's history and
 * the stock list, because they all read the same store. Derived values should
 * be wrapped in `useMemo` keyed on the slice they actually use.
 */
export function useDb(): Database {
  return useDataStore((state) => state.db);
}

/** Subscribe to a single table, so unrelated writes do not re-render. */
export function useTable<K extends keyof Database>(table: K): Database[K] {
  return useDataStore((state) => state.db[table]);
}
