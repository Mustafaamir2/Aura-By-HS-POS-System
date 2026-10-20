/**
 * Every localStorage touch goes through here. Reads and writes can throw in
 * private windows or when site data is blocked, so nothing may assume success.
 */

const NAMESPACE = 'aura';

export function storageKey(key: string): string {
  return `${NAMESPACE}:${key}`;
}

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(storageKey(key));
  } catch {
    /* nothing we can do; the app still works in-memory */
  }
}

/** Wipe only this app's keys, leaving anything else on the origin untouched. */
export function clearNamespace(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(`${NAMESPACE}:`)) doomed.push(key);
    }
    doomed.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}
