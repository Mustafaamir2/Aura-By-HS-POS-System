import { addDays, parseISO, subMinutes } from 'date-fns';
import type {
  Appointment,
  AppNotification,
  Customer,
  CustomerMembership,
  Product,
  Sale,
} from '@/types';
import { formatCurrency } from '@/utils/money';
import { formatFriendlyDateTime } from '@/utils/date';
import { makeRng } from '@/utils/random';
import { memberships } from './catalog';

const NOW = '2026-01-05T09:00:00.000Z';

/**
 * Seed notifications are derived from records that already exist, so every one
 * of them links somewhere real. Live notifications are raised by the stores.
 */
export function buildNotifications(
  today: Date,
  appointments: Appointment[],
  sales: Sale[],
  products: Product[],
  customers: Customer[],
  customerMemberships: CustomerMembership[],
): AppNotification[] {
  const rng = makeRng(13579);
  const rows: AppNotification[] = [];
  let n = 0;

  const nameOf = (customerId: string): string =>
    customers.find((c) => c.id === customerId)?.name ?? 'A customer';

  const push = (row: Omit<AppNotification, 'id' | 'createdAt' | 'updatedAt'> & { at: Date }): void => {
    n += 1;
    const { at, ...rest } = row;
    // Some sources are dated ahead of now (sales seeded for the rest of today,
    // bookings stamped at a future slot). A notification cannot be raised
    // before its event happens, so pull those into the recent past, spread out
    // so they do not all read "just now" and still sort sensibly.
    const nowMs = Date.now();
    const raisedAt =
      at.getTime() > nowMs ? new Date(nowMs - rng.int(2, 240) * 60_000) : at;
    rows.push({
      ...rest,
      id: `ntf_${String(n).padStart(4, '0')}`,
      createdAt: raisedAt.toISOString(),
      updatedAt: NOW,
    });
  };

  // --- Upcoming bookings made recently ---
  const recentBookings = appointments
    .filter((a) => parseISO(a.startAt).getTime() > today.getTime())
    .slice(0, 14);
  for (const a of recentBookings) {
    push({
      at: parseISO(a.createdAt),
      shopId: a.shopId,
      type: 'appointment-created',
      title: 'New appointment booked',
      message: `${nameOf(a.customerId)} is booked for ${formatFriendlyDateTime(a.startAt)}.`,
      read: rng.next() < 0.55,
      link: `/appointments?id=${a.id}`,
      severity: 'info',
    });
  }

  // --- Reminders for anything starting within the next 30 minutes ---
  const soon = appointments.filter((a) => {
    const diff = parseISO(a.startAt).getTime() - today.getTime();
    return diff > 0 && diff <= 30 * 60000 && a.status !== 'cancelled';
  });
  for (const a of soon) {
    push({
      at: subMinutes(parseISO(a.startAt), 30),
      shopId: a.shopId,
      type: 'appointment-reminder',
      title: 'Appointment starting soon',
      message: `${nameOf(a.customerId)} arrives at ${formatFriendlyDateTime(a.startAt)}.`,
      read: false,
      link: `/appointments?id=${a.id}`,
      severity: 'warning',
    });
  }

  // --- Cancellations and no-shows from the last fortnight ---
  const recentProblems = appointments
    .filter((a) => {
      const age = today.getTime() - parseISO(a.startAt).getTime();
      return age > 0 && age < 14 * 86400000 && (a.status === 'cancelled' || a.status === 'no-show');
    })
    .slice(-12);
  for (const a of recentProblems) {
    const isCancel = a.status === 'cancelled';
    push({
      at: parseISO(a.startAt),
      shopId: a.shopId,
      type: isCancel ? 'appointment-cancelled' : 'appointment-no-show',
      title: isCancel ? 'Appointment cancelled' : 'Customer did not arrive',
      message: isCancel
        ? `${nameOf(a.customerId)} cancelled their ${formatFriendlyDateTime(a.startAt)} slot.`
        : `${nameOf(a.customerId)} missed their ${formatFriendlyDateTime(a.startAt)} slot.`,
      read: rng.next() < 0.5,
      link: `/appointments?id=${a.id}`,
      severity: isCancel ? 'warning' : 'danger',
    });
  }

  // --- Payments taken today and yesterday ---
  const recentSales = sales
    .filter((s) => today.getTime() - parseISO(s.soldAt).getTime() < 2 * 86400000)
    .slice(-15);
  for (const s of recentSales) {
    push({
      at: parseISO(s.soldAt),
      shopId: s.shopId,
      type: s.status === 'refunded' ? 'refund' : 'payment-completed',
      title: s.status === 'refunded' ? 'Sale refunded' : 'Payment received',
      message:
        s.status === 'refunded'
          ? `${s.receiptNo} was refunded (${formatCurrency(s.total)}).`
          : `${formatCurrency(s.total)} taken on ${s.receiptNo} from ${s.customerName}.`,
      read: rng.next() < 0.7,
      link: `/billing/bills?receipt=${encodeURIComponent(s.receiptNo)}`,
      severity: s.status === 'refunded' ? 'warning' : 'success',
    });
  }

  // --- Stock alerts, generated from the real counts ---
  for (const p of products) {
    if (!p.active) continue;
    if (p.stock === 0) {
      push({
        at: subMinutes(today, rng.int(30, 4000)),
        shopId: p.shopId,
        type: 'out-of-stock',
        title: 'Out of stock',
        message: `${p.brand} ${p.name} has run out. Reorder from ${p.supplier}.`,
        read: false,
        link: `/inventory?product=${p.id}`,
        severity: 'danger',
      });
    } else if (p.stock <= p.minStock) {
      push({
        at: subMinutes(today, rng.int(30, 6000)),
        shopId: p.shopId,
        type: 'low-stock',
        title: 'Low stock',
        message: `${p.brand} ${p.name} is down to ${p.stock} ${p.unit}${p.stock === 1 ? '' : 's'} (minimum ${p.minStock}).`,
        read: rng.next() < 0.3,
        link: `/inventory?product=${p.id}`,
        severity: 'warning',
      });
    }
  }

  // --- Memberships lapsing within 30 days ---
  const cutoff = addDays(today, 30);
  for (const held of customerMemberships) {
    if (held.status !== 'active') continue;
    const expires = parseISO(held.expiresOn);
    if (expires.getTime() > cutoff.getTime() || expires.getTime() < today.getTime()) continue;
    const tier = memberships.find((t) => t.id === held.membershipId);
    push({
      at: subMinutes(today, rng.int(60, 3000)),
      shopId: held.shopId,
      type: 'membership-expiring',
      title: 'Membership expiring soon',
      message: `${nameOf(held.customerId)}'s ${tier?.name ?? ''} membership expires on ${held.expiresOn}.`,
      read: rng.next() < 0.4,
      link: `/customers/${held.customerId}`,
      severity: 'info',
    });
  }

  // --- A few recent sign-ups ---
  const newest = [...customers]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  for (const c of newest) {
    push({
      at: parseISO(c.createdAt),
      shopId: c.shopId,
      type: 'customer-created',
      title: 'New customer added',
      message: `${c.name} was added to the customer book.`,
      read: rng.next() < 0.8,
      link: `/customers/${c.id}`,
      severity: 'info',
    });
  }

  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
