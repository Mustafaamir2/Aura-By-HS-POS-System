import { subDays } from 'date-fns';
import type { InventoryMovement, MovementType, Product, Sale } from '@/types';
import { makeRng } from '@/utils/random';

const NOW = '2026-01-05T09:00:00.000Z';

const ADJUSTMENT_REASONS = [
  'Stock count correction after audit',
  'Damaged in transit, written off',
  'Expired stock removed',
  'Tester bottle opened for the floor',
  'Miscount at previous audit',
];

interface PendingEvent {
  at: Date;
  type: MovementType;
  /** Signed: positive adds stock, negative removes it. */
  quantity: number;
  reason: string;
  referenceId: string | null;
  userName: string;
}

/**
 * Rebuilds a plausible movement log that reconciles exactly to each product's
 * current stock.
 *
 * The order matters: events are collected with their real dates, sorted
 * chronologically, and only then walked to compute the before/after chain. The
 * opening purchase is sized so the final `stockAfter` lands on `product.stock`.
 */
export function buildInventoryMovements(
  products: Product[],
  sales: Sale[],
  today: Date,
): InventoryMovement[] {
  const rng = makeRng(24680);
  const rows: InventoryMovement[] = [];
  let n = 0;

  // Sale lines that touched each product.
  const salesByProduct = new Map<string, { sale: Sale; qty: number }[]>();
  for (const sale of sales) {
    // A refunded sale put its stock back, so it nets to zero and is skipped.
    if (sale.status === 'refunded') continue;
    for (const item of sale.items) {
      if (item.kind !== 'product') continue;
      const list = salesByProduct.get(item.refId) ?? [];
      list.push({ sale, qty: item.quantity });
      salesByProduct.set(item.refId, list);
    }
  }

  for (const product of products) {
    const events: PendingEvent[] = [];

    for (const { sale, qty } of salesByProduct.get(product.id) ?? []) {
      events.push({
        at: new Date(sale.soldAt),
        type: 'sale',
        quantity: -qty,
        reason: `Sold on receipt ${sale.receiptNo}`,
        referenceId: sale.id,
        userName: 'Front Desk',
      });
    }

    // Roughly a third of products have had a correction at some point.
    if (rng.next() < 0.3) {
      events.push({
        at: subDays(today, rng.int(1, 30)),
        type: 'adjustment',
        quantity: -rng.int(1, 3),
        reason: rng.pick(ADJUSTMENT_REASONS),
        referenceId: null,
        userName: 'Hira & Shumaila',
      });
    }

    events.sort((a, b) => a.at.getTime() - b.at.getTime());

    // Work backwards from today's figure to find what must have been received.
    const netChange = events.reduce((sum, event) => sum + event.quantity, 0);
    const opening = product.stock - netChange;

    const earliest = events[0]?.at ?? today;
    const openedAt = subDays(earliest, rng.int(3, 20));

    let running = 0;

    n += 1;
    rows.push({
      id: `inv_${String(n).padStart(5, '0')}`,
      shopId: product.shopId,
      createdAt: openedAt.toISOString(),
      updatedAt: NOW,
      productId: product.id,
      type: 'purchase',
      quantity: opening,
      stockBefore: 0,
      stockAfter: (running = opening),
      reason: `Opening stock received from ${product.supplier}`,
      referenceId: null,
      userId: 'usr_0001',
      userName: 'Hira & Shumaila',
    });

    for (const event of events) {
      const before = running;
      running += event.quantity;

      n += 1;
      rows.push({
        id: `inv_${String(n).padStart(5, '0')}`,
        shopId: product.shopId,
        createdAt: event.at.toISOString(),
        updatedAt: NOW,
        productId: product.id,
        type: event.type,
        quantity: event.quantity,
        stockBefore: before,
        stockAfter: running,
        reason: event.reason,
        referenceId: event.referenceId,
        userId: 'usr_0001',
        userName: event.userName,
      });
    }
  }

  // Newest first, which is how every view reads the log.
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
