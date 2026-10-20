/**
 * Money is stored as a plain number of major currency units (e.g. rupees),
 * rounded to 2 decimals at every boundary so repeated arithmetic cannot drift.
 * Every display path goes through `formatCurrency`.
 */

let currentCurrency = 'PKR';
let currentLocale = 'en-PK';
let currentSymbol = 'Rs';

/** Called once by the settings store so formatting follows billing settings. */
export function configureCurrency(opts: {
  currencyCode: string;
  locale: string;
  symbol: string;
}): void {
  currentCurrency = opts.currencyCode;
  currentLocale = opts.locale;
  currentSymbol = opts.symbol;
}

/** Round to 2 decimals, avoiding the classic 1.005 float artefact. */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(value: number, opts?: { compact?: boolean }): string {
  const amount = round2(value);
  if (opts?.compact && Math.abs(amount) >= 1000) {
    return `${currentSymbol} ${formatCompactNumber(amount)}`;
  }
  try {
    return new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency: currentCurrency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currentSymbol} ${amount.toLocaleString()}`;
  }
}

export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10_000_000) return `${round2(value / 10_000_000)}Cr`;
  if (abs >= 100_000) return `${round2(value / 100_000)}L`;
  if (abs >= 1000) return `${round2(value / 1000)}K`;
  return String(round2(value));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(currentLocale).format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

/** Percentage of a base amount, rounded to currency precision. */
export function pctOf(base: number, pct: number): number {
  return round2((base * pct) / 100);
}

/** Growth from `previous` to `current`, as a percentage. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}
