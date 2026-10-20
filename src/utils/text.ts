/** Case- and diacritic-insensitive substring match used by every search box. */
export function matches(haystack: string | null | undefined, needle: string): boolean {
  if (!needle.trim()) return true;
  if (!haystack) return false;
  return normalize(haystack).includes(normalize(needle));
}

export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function titleCase(value: string): string {
  return value
    .split(/[\s-_]+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/** Strip everything but digits, so "+92 300-1234567" compares equal to "923001234567". */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Display form for Pakistani mobile numbers: 0300 1234567. */
export function formatPhone(value: string): string {
  const d = digitsOnly(value);
  if (d.length === 11 && d.startsWith('0')) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return value;
}
