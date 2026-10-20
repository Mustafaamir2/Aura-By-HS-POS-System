import type { Membership, SaleItem } from '@/types';
import { pctOf, round2 } from '@/utils/money';

/**
 * The single source of truth for bill arithmetic. The billing screen, the
 * receipt, the seed data and the reports all call this, so a total can never
 * disagree with itself depending on where it was rendered.
 *
 * Order of operations, deliberately fixed:
 *   1. line totals   = (unitPrice x qty) - lineDiscount
 *   2. subtotal      = sum of line totals
 *   3. membership    = % of subtotal, from the customer's active tier
 *   4. bill discount = % or fixed amount, applied after membership
 *   5. tax           = % of (subtotal - membership - bill discount)
 *   6. total         = taxable base + tax
 */

export interface BillDiscountInput {
  mode: 'percent' | 'amount';
  value: number;
}

export interface PricingInput {
  items: SaleItem[];
  billDiscount: BillDiscountInput;
  membershipDiscountPct: number;
  taxRatePct: number;
}

export interface PricingResult {
  /** Sum of unitPrice x quantity, before any discount. */
  gross: number;
  itemDiscountTotal: number;
  /** Gross minus per-line discounts. */
  subtotal: number;
  membershipDiscount: number;
  billDiscount: number;
  totalDiscount: number;
  taxableBase: number;
  taxAmount: number;
  total: number;
}

export function lineTotal(item: Pick<SaleItem, 'unitPrice' | 'quantity' | 'discount'>): number {
  return round2(Math.max(0, item.unitPrice * item.quantity - item.discount));
}

export function calculateBill(input: PricingInput): PricingResult {
  const { items, billDiscount, membershipDiscountPct, taxRatePct } = input;

  const gross = round2(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
  const itemDiscountTotal = round2(items.reduce((sum, i) => sum + i.discount, 0));
  const subtotal = round2(items.reduce((sum, i) => sum + lineTotal(i), 0));

  const membershipDiscount = Math.min(subtotal, pctOf(subtotal, membershipDiscountPct));
  const afterMembership = round2(subtotal - membershipDiscount);

  const rawBillDiscount =
    billDiscount.mode === 'percent'
      ? pctOf(afterMembership, clampPct(billDiscount.value))
      : round2(Math.max(0, billDiscount.value));
  const appliedBillDiscount = Math.min(afterMembership, rawBillDiscount);

  const taxableBase = round2(Math.max(0, afterMembership - appliedBillDiscount));
  const taxAmount = pctOf(taxableBase, Math.max(0, taxRatePct));
  const total = round2(taxableBase + taxAmount);

  return {
    gross,
    itemDiscountTotal,
    subtotal,
    membershipDiscount,
    billDiscount: appliedBillDiscount,
    totalDiscount: round2(itemDiscountTotal + membershipDiscount + appliedBillDiscount),
    taxableBase,
    taxAmount,
    total,
  };
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** Discount percentage an active membership grants; 0 when there is none. */
export function membershipDiscountPct(tier: Membership | null | undefined): number {
  return tier?.active ? tier.discountPct : 0;
}

/** What a package saves against buying its services individually. */
export function packageSavings(packagePrice: number, individualTotal: number): {
  amount: number;
  percent: number;
} {
  const amount = round2(Math.max(0, individualTotal - packagePrice));
  const percent = individualTotal > 0 ? round2((amount / individualTotal) * 100) : 0;
  return { amount, percent };
}

/** Margin on a retail product line. */
export function productMargin(costPrice: number, sellingPrice: number): {
  amount: number;
  percent: number;
} {
  const amount = round2(sellingPrice - costPrice);
  const percent = sellingPrice > 0 ? round2((amount / sellingPrice) * 100) : 0;
  return { amount, percent };
}

/** Total tendered across split payments. */
export function paidTotal(payments: { amount: number }[]): number {
  return round2(payments.reduce((sum, p) => sum + p.amount, 0));
}

/** Cash handed over beyond what was owed. */
export function changeFor(payments: { method: string; amount: number; tendered: number | null }[]): number {
  const cashTendered = payments
    .filter((p) => p.method === 'cash' && p.tendered != null)
    .reduce((sum, p) => sum + (p.tendered ?? 0), 0);
  const cashDue = payments.filter((p) => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
  return round2(Math.max(0, cashTendered - cashDue));
}

/** Receipt numbers look like LMG-2026-000123 and are sequential per shop. */
export function formatReceiptNo(shopCode: string, year: number, sequence: number): string {
  return `${shopCode}-${year}-${String(sequence).padStart(6, '0')}`;
}
