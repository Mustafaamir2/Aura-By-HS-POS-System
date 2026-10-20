/**
 * Collision-resistant enough for a single-browser demo. When a real backend
 * arrives, ids come from the database and this helper is only used for
 * client-side draft rows (e.g. cart lines before checkout).
 */
export function uid(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

/** Deterministic id for seed data, so a reseed produces stable references. */
export function seedId(prefix: string, n: number): string {
  return `${prefix}_${String(n).padStart(4, '0')}`;
}
