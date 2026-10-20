/**
 * Seeded pseudo-random generator (mulberry32). Seed data must be identical on
 * every reseed, otherwise the demo's reports and charts would change shape each
 * time someone clicks "Reset demo data".
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(rows: readonly T[]): T;
  /** Pick `count` distinct members, or all of them if the list is shorter. */
  sample<T>(rows: readonly T[], count: number): T[];
  bool(probability: number): boolean;
  /** Weighted pick: `weights[i]` is the relative likelihood of `rows[i]`. */
  weighted<T>(rows: readonly T[], weights: readonly number[]): T;
}

export function makeRng(seed: number): Rng {
  const next = createRng(seed);
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  const pickOne = <T,>(rows: readonly T[]): T => {
    if (rows.length === 0) throw new Error('rng.pick() called on an empty array');
    return rows[int(0, rows.length - 1)]!;
  };
  return {
    next,
    int,
    pick: pickOne,
    bool: (probability) => next() < probability,
    sample: <T,>(rows: readonly T[], count: number): T[] => {
      const pool = [...rows];
      const out: T[] = [];
      const take = Math.min(count, pool.length);
      for (let i = 0; i < take; i += 1) {
        const idx = int(0, pool.length - 1);
        out.push(pool[idx]!);
        pool.splice(idx, 1);
      }
      return out;
    },
    weighted: <T,>(rows: readonly T[], weights: readonly number[]): T => {
      if (rows.length === 0) throw new Error('rng.weighted() called on an empty array');
      const total = weights.reduce((sum, w) => sum + w, 0);
      let roll = next() * total;
      for (let i = 0; i < rows.length; i += 1) {
        roll -= weights[i] ?? 0;
        if (roll <= 0) return rows[i]!;
      }
      return rows[rows.length - 1]!;
    },
  };
}
