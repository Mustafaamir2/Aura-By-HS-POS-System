import { addMinutes, getYear, parseISO } from 'date-fns';
import type {
  Appointment,
  Customer,
  CustomerMembership,
  Payment,
  PaymentMethod,
  Product,
  Sale,
  SaleItem,
} from '@/types';
import { round2 } from '@/utils/money';
import { makeRng } from '@/utils/random';
import { calculateBill, formatReceiptNo, lineTotal } from '@/services/pricing';
import { memberships, services as allServices } from './catalog';
import { shops } from './shops';
import { staff as allStaff } from './staff';
import { defaultSettings } from './settings';

const NOW = '2026-01-05T09:00:00.000Z';

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'bank-transfer', 'other'];
const PAYMENT_WEIGHTS = [5, 6, 1.5, 0.4];

interface BuildSalesResult {
  sales: Sale[];
  /** appointmentId -> saleId, so appointments can be linked back. */
  links: Map<string, string>;
  /** Stock consumed by retail lines, so seeded inventory stays consistent. */
  stockUsed: Map<string, number>;
}

/**
 * Bills every completed appointment, then adds standalone retail sales so the
 * products module has real movement behind it.
 */
export function buildSales(
  appointments: Appointment[],
  customers: Customer[],
  customerMemberships: CustomerMembership[],
  products: Product[],
): BuildSalesResult {
  const rng = makeRng(778899);
  const taxRate = defaultSettings.billing.taxRatePct;

  const sales: Sale[] = [];
  const links = new Map<string, string>();
  const stockUsed = new Map<string, number>();
  const sequence = new Map<string, number>();
  let n = 0;

  const activeTierFor = (customerId: string, when: Date): number => {
    const held = customerMemberships.find(
      (m) =>
        m.customerId === customerId &&
        m.status === 'active' &&
        parseISO(m.startsOn).getTime() <= when.getTime() &&
        parseISO(m.expiresOn).getTime() >= when.getTime(),
    );
    if (!held) return 0;
    return memberships.find((t) => t.id === held.membershipId)?.discountPct ?? 0;
  };

  const nextReceipt = (shopId: string, when: Date): string => {
    const shop = shops.find((s) => s.id === shopId);
    const code = shop?.code ?? 'LMX';
    const key = `${code}-${getYear(when)}`;
    const next = (sequence.get(key) ?? 0) + 1;
    sequence.set(key, next);
    return formatReceiptNo(code, getYear(when), next);
  };

  const buildPayments = (total: number, when: Date): { payments: Payment[]; change: number } => {
    const split = rng.next() < 0.06 && total > 5000;
    if (split) {
      const cardPart = round2(Math.round((total * rng.int(30, 70)) / 100));
      const cashPart = round2(total - cardPart);
      const tendered = Math.ceil(cashPart / 500) * 500;
      return {
        payments: [
          { id: `pay_${when.getTime()}_a`, method: 'card', amount: cardPart, tendered: null, reference: `AUTH${rng.int(100000, 999999)}` },
          { id: `pay_${when.getTime()}_b`, method: 'cash', amount: cashPart, tendered, reference: null },
        ],
        change: round2(tendered - cashPart),
      };
    }

    const method = rng.weighted(PAYMENT_METHODS, PAYMENT_WEIGHTS);
    if (method === 'cash') {
      const tendered = Math.ceil(total / 500) * 500;
      return {
        payments: [{ id: `pay_${when.getTime()}`, method, amount: total, tendered, reference: null }],
        change: round2(tendered - total),
      };
    }
    return {
      payments: [
        {
          id: `pay_${when.getTime()}`,
          method,
          amount: total,
          tendered: null,
          reference: method === 'card' ? `AUTH${rng.int(100000, 999999)}` : `TRX${rng.int(10000, 99999)}`,
        },
      ],
      change: 0,
    };
  };

  const finalise = (
    shopId: string,
    when: Date,
    items: SaleItem[],
    customerId: string | null,
    customerName: string,
    staffId: string | null,
    appointmentId: string | null,
  ): Sale | null => {
    if (items.length === 0) return null;

    const memberPct = customerId ? activeTierFor(customerId, when) : 0;
    // Occasional goodwill discount at the counter.
    const billPct = rng.next() < 0.14 ? rng.int(5, 12) : 0;

    const totals = calculateBill({
      items,
      billDiscount: { mode: 'percent', value: billPct },
      membershipDiscountPct: memberPct,
      taxRatePct: taxRate,
    });

    const { payments, change } = buildPayments(totals.total, when);
    // A small number of older bills were refunded.
    const refunded = when.getTime() < Date.now() - 3 * 86400000 && rng.next() < 0.018;

    n += 1;
    return {
      id: `sal_${String(n).padStart(4, '0')}`,
      shopId,
      createdAt: when.toISOString(),
      updatedAt: NOW,
      receiptNo: nextReceipt(shopId, when),
      customerId,
      customerName,
      staffId,
      appointmentId,
      items,
      subtotal: totals.subtotal,
      itemDiscountTotal: totals.itemDiscountTotal,
      billDiscount: totals.billDiscount,
      membershipDiscount: totals.membershipDiscount,
      taxRate,
      taxAmount: totals.taxAmount,
      total: totals.total,
      payments,
      changeGiven: change,
      status: refunded ? 'refunded' : 'completed',
      refundReason: refunded ? 'Customer was unhappy with the finish; refunded in full.' : null,
      refundedAt: refunded ? addMinutes(when, rng.int(60, 2880)).toISOString() : null,
      soldAt: when.toISOString(),
      notes: '',
    };
  };

  // ---- 1. Bill every completed appointment ----
  const completed = appointments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  for (const appointment of completed) {
    const when = addMinutes(parseISO(appointment.startAt), appointment.durationMin);
    const customer = customers.find((c) => c.id === appointment.customerId);
    const items: SaleItem[] = [];

    for (const booked of appointment.services) {
      const service = allServices.find((s) => s.id === booked.serviceId);
      if (!service) continue;
      const item: SaleItem = {
        id: `sit_${appointment.id}_${booked.serviceId}`,
        kind: 'service',
        refId: booked.serviceId,
        name: service.name,
        unitPrice: booked.price,
        quantity: 1,
        discount: 0,
        staffId: appointment.staffId,
        lineTotal: 0,
      };
      item.lineTotal = lineTotal(item);
      items.push(item);
    }

    // Roughly one in five service visits also takes a product home.
    if (rng.next() < 0.2) {
      const retail = products.filter(
        (p) => p.shopId === appointment.shopId && p.active && !p.backBarOnly,
      );
      if (retail.length > 0) {
        const product = rng.pick(retail);
        const qty = 1;
        const item: SaleItem = {
          id: `sit_${appointment.id}_${product.id}`,
          kind: 'product',
          refId: product.id,
          name: `${product.brand} ${product.name}`,
          unitPrice: product.sellingPrice,
          quantity: qty,
          discount: 0,
          staffId: appointment.staffId,
          lineTotal: 0,
        };
        item.lineTotal = lineTotal(item);
        items.push(item);
        stockUsed.set(product.id, (stockUsed.get(product.id) ?? 0) + qty);
      }
    }

    const sale = finalise(
      appointment.shopId,
      when,
      items,
      appointment.customerId,
      customer?.name ?? 'Walk-in',
      appointment.staffId,
      appointment.id,
    );
    if (sale) {
      sales.push(sale);
      links.set(appointment.id, sale.id);
    }
  }

  // ---- 2. Standalone retail / walk-in sales ----
  for (const shop of shops) {
    const retail = products.filter((p) => p.shopId === shop.id && p.active && !p.backBarOnly);
    if (retail.length === 0) continue;
    const shopStaff = allStaff.filter((s) => s.shopId === shop.id && s.active);
    const shopCustomers = customers.filter((c) => c.shopId === shop.id);

    const count = rng.int(22, 34);
    for (let i = 0; i < count; i += 1) {
      const daysAgo = rng.int(0, 70);
      const when = addMinutes(
        new Date(Date.now() - daysAgo * 86400000),
        rng.int(-240, 240),
      );

      const items: SaleItem[] = [];
      const lines = rng.int(1, 3);
      for (let j = 0; j < lines; j += 1) {
        const product = rng.pick(retail);
        if (items.some((it) => it.refId === product.id)) continue;
        const qty = rng.weighted([1, 2, 3], [7, 2, 0.6]);
        const item: SaleItem = {
          id: `sit_walk_${shop.code}_${i}_${j}`,
          kind: 'product',
          refId: product.id,
          name: `${product.brand} ${product.name}`,
          unitPrice: product.sellingPrice,
          quantity: qty,
          discount: 0,
          staffId: shopStaff.length > 0 ? rng.pick(shopStaff).id : null,
          lineTotal: 0,
        };
        item.lineTotal = lineTotal(item);
        items.push(item);
        stockUsed.set(product.id, (stockUsed.get(product.id) ?? 0) + qty);
      }

      // Two thirds of counter sales are to a known customer.
      const known = rng.next() < 0.66 && shopCustomers.length > 0 ? rng.pick(shopCustomers) : null;

      const sale = finalise(
        shop.id,
        when,
        items,
        known?.id ?? null,
        known?.name ?? 'Walk-in customer',
        items[0]?.staffId ?? null,
        null,
      );
      if (sale) sales.push(sale);
    }
  }

  sales.sort((a, b) => a.soldAt.localeCompare(b.soldAt));
  return { sales, links, stockUsed };
}
