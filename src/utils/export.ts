/**
 * Client-side file exports. CSV is generated directly; "PDF" uses the browser's
 * own print-to-PDF, which keeps the bundle free of a PDF engine and renders the
 * receipt exactly as the print stylesheet describes it.
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  // Quote when the cell contains a delimiter, quote or newline.
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(','));
  return [header, ...body].join('\r\n');
}

export function downloadBlob(content: BlobPart, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Give the browser a tick to start the download before revoking.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Excel opens UTF-8 CSV correctly only when a BOM is present. */
export function downloadCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string): void {
  const csv = toCsv(rows, columns);
  downloadBlob(`﻿${csv}`, ensureExt(filename, 'csv'), 'text/csv;charset=utf-8;');
}

export function downloadJson(data: unknown, filename: string): void {
  downloadBlob(JSON.stringify(data, null, 2), ensureExt(filename, 'json'), 'application/json');
}

function ensureExt(filename: string, ext: string): string {
  return filename.toLowerCase().endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
}

/**
 * Opens the print dialog, from which the user can pick "Save as PDF".
 * The print stylesheet hides everything outside `.print-area`.
 */
export function printDocument(): void {
  window.print();
}

export function timestampedName(base: string): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return `${base}-${stamp}`;
}
