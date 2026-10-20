import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from 'date-fns';
import type { Appointment, Sale } from '@/types';
import { round2 } from '@/utils/money';
import { read, scopeTo } from './db';
import { totalBetween } from './expenseService';
import { performance as staffPerformance, type StaffPerformance } from './staffService';
import { stockStatus } from './inventoryService';

/**
 * Every figure in the reports and dashboards is computed here from the live
 * tables. Nothing is cached or hard-coded, so a sale taken thirty seconds ago
 * moves the numbers on the next render.
 */

export type Granularity = 'day' | 'week' | 'month' | 'year';

export interface Period {
  from: Date;
  to: Date;
}

export function periodFor(granularity: Granularity, anchor = new Date()): Period {
  switch (granularity) {
    case 'day':
      return { from: startOfDay(anchor), to: endOfDay(anchor) };
    case 'week':
      return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) };
    case 'month':
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    case 'year':
      return { from: startOfYear(anchor), to: endOfYear(anchor) };
  }
}

function within(iso: string, period: Period): boolean {
  const t = parseISO(iso).getTime();
  return t >= period.from.getTime() && t <= period.to.getTime();
}

export function salesIn(shopId: string | null, period: Period): Sale[] {
  return scopeTo(read().sales, shopId).filter((s) => s.status === 'completed' && within(s.soldAt, period));
}

export function appointmentsIn(shopId: string | null, period: Period): Appointment[] {
  return scopeTo(read().appointments, shopId).filter((a) => within(a.startAt, period));
}

// ------------------------------------------------------------ revenue series

export interface SeriesPoint {
  label: string;
  /** ISO date the bucket starts, for tooltips and drill-down. */
  key: string;
  revenue: number;
  bills: number;
  appointments: number;
}

/**
 * One point per bucket across the period. Quiet days are included as zero —
 * a chart with gaps hides them — but buckets in the future are left out
 * entirely, so a week-to-date line stops at today rather than diving to zero.
 */
export function revenueSeries(
  shopId: string | null,
  period: Period,
  granularity: Granularity,
): SeriesPoint[] {
  const sales = salesIn(shopId, period);
  const appointments = appointmentsIn(shopId, period);

  /*
   * Never plot buckets that have not happened yet. A week-to-date chart that
   * draws the remaining days as zero reads as a collapse in revenue rather
   * than as time that has simply not arrived, which is actively misleading.
   */
  const now = new Date();
  const end = period.to.getTime() > now.getTime() && period.from.getTime() <= now.getTime()
    ? now
    : period.to;

  const buckets = (() => {
    if (granularity === 'day') return eachDayOfInterval({ start: period.from, end });
    if (granularity === 'week')
      return eachWeekOfInterval({ start: period.from, end }, { weekStartsOn: 1 });
    return eachMonthOfInterval({ start: period.from, end });
  })();

  /** A bucket runs until the next one starts, or to the end of the period. */
  const bucketEnd = (index: number): Date => {
    const next = buckets[index + 1];
    return next ? new Date(next.getTime() - 1) : period.to;
  };

  const labelFor = (d: Date): string => {
    if (granularity === 'day') return format(d, 'd MMM');
    if (granularity === 'week') return `w/c ${format(d, 'd MMM')}`;
    return format(d, 'MMM yyyy');
  };

  return buckets.map((start, index) => {
    const end = bucketEnd(index);
    const inBucket = (iso: string): boolean => {
      const t = parseISO(iso).getTime();
      return t >= start.getTime() && t <= end.getTime();
    };
    const bucketSales = sales.filter((s) => inBucket(s.soldAt));
    return {
      label: labelFor(start),
      key: format(start, 'yyyy-MM-dd'),
      revenue: round2(bucketSales.reduce((sum, s) => sum + s.total, 0)),
      bills: bucketSales.length,
      appointments: appointments.filter((a) => inBucket(a.startAt)).length,
    };
  });
}

/** Hourly revenue across a single day, for the "Today" toggle. */
export function hourlySeries(shopId: string | null, day = new Date()): SeriesPoint[] {
  const sales = scopeTo(read().sales, shopId).filter(
    (s) => s.status === 'completed' && isSameDay(parseISO(s.soldAt), day),
  );
  const appointments = scopeTo(read().appointments, shopId).filter((a) =>
    isSameDay(parseISO(a.startAt), day),
  );

  // Stop at the current hour on today, for the same reason as above.
  const isToday = isSameDay(day, new Date());
  const lastHour = isToday ? Math.max(9, new Date().getHours()) : 21;

  return Array.from({ length: 13 }, (_, i) => i + 9)
    .filter((hour) => hour <= lastHour)
    .map((hour) => {
      const inHour = (iso: string): boolean => parseISO(iso).getHours() === hour;
      const bucketSales = sales.filter((s) => inHour(s.soldAt));
      return {
        label: format(new Date(2000, 0, 1, hour), 'h a'),
        key: String(hour),
        revenue: round2(bucketSales.reduce((sum, s) => sum + s.total, 0)),
        bills: bucketSales.length,
        appointments: appointments.filter((a) => inHour(a.startAt)).length,
      };
    });
}

// --------------------------------------------------------------------- KPIs

export interface KpiSet {
  revenue: number;
  bills: number;
  averageBill: number;
  appointmentsTotal: number;
  appointmentsCompleted: number;
  appointmentsPending: number;
  appointmentsCancelled: number;
  appointmentsNoShow: number;
  newCustomers: number;
  returningCustomers: number;
}

export function kpis(shopId: string | null, period: Period): KpiSet {
  const sales = salesIn(shopId, period);
  const appointments = appointmentsIn(shopId, period);
  const revenue = round2(sales.reduce((sum, s) => sum + s.total, 0));

  const customers = scopeTo(read().customers, shopId);
  const newCustomers = customers.filter((c) => within(c.createdAt, period)).length;

  const servedIds = new Set(sales.map((s) => s.customerId).filter(Boolean));

  return {
    revenue,
    bills: sales.length,
    averageBill: sales.length > 0 ? round2(revenue / sales.length) : 0,
    appointmentsTotal: appointments.length,
    appointmentsCompleted: appointments.filter((a) => a.status === 'completed').length,
    appointmentsPending: appointments.filter((a) => a.status === 'pending').length,
    appointmentsCancelled: appointments.filter((a) => a.status === 'cancelled').length,
    appointmentsNoShow: appointments.filter((a) => a.status === 'no-show').length,
    newCustomers,
    returningCustomers: Math.max(0, servedIds.size - newCustomers),
  };
}

/** Same window, shifted back by its own length, for period-on-period deltas. */
export function previousPeriod(period: Period): Period {
  const span = period.to.getTime() - period.from.getTime();
  return {
    from: new Date(period.from.getTime() - span - 1),
    to: new Date(period.from.getTime() - 1),
  };
}

// ---------------------------------------------------------- service reports

export interface ServiceReportRow {
  serviceId: string;
  name: string;
  categoryName: string;
  bookings: number;
  revenue: number;
}

export function serviceReport(shopId: string | null, period: Period): ServiceReportRow[] {
  const db = read();
  const appointments = appointmentsIn(shopId, period).filter((a) => a.status === 'completed');
  const sales = salesIn(shopId, period);

  const map = new Map<string, { bookings: number; revenue: number }>();

  for (const appointment of appointments) {
    for (const booked of appointment.services) {
      const entry = map.get(booked.serviceId) ?? { bookings: 0, revenue: 0 };
      entry.bookings += 1;
      map.set(booked.serviceId, entry);
    }
  }

  // Revenue comes from what was actually billed, not the list price.
  for (const sale of sales) {
    for (const item of sale.items) {
      if (item.kind !== 'service') continue;
      const entry = map.get(item.refId) ?? { bookings: 0, revenue: 0 };
      entry.revenue += item.lineTotal;
      map.set(item.refId, entry);
    }
  }

  return [...map.entries()]
    .map(([serviceId, entry]) => {
      const service = db.services.find((s) => s.id === serviceId);
      const category = db.serviceCategories.find((c) => c.id === service?.categoryId);
      return {
        serviceId,
        name: service?.name ?? 'Removed service',
        categoryName: category?.name ?? '—',
        bookings: entry.bookings,
        revenue: round2(entry.revenue),
      };
    })
    .sort((a, b) => b.bookings - a.bookings);
}

// ---------------------------------------------------------- customer reports

export interface CustomerReportRow {
  customerId: string;
  name: string;
  phone: string;
  visits: number;
  spent: number;
  lastVisit: string | null;
}

export function topCustomers(shopId: string | null, period: Period, limit = 10): CustomerReportRow[] {
  const db = read();
  const sales = salesIn(shopId, period);
  const map = new Map<string, { spent: number; visits: number; last: string | null }>();

  for (const sale of sales) {
    if (!sale.customerId) continue;
    const entry = map.get(sale.customerId) ?? { spent: 0, visits: 0, last: null };
    entry.spent += sale.total;
    entry.visits += 1;
    if (!entry.last || sale.soldAt > entry.last) entry.last = sale.soldAt;
    map.set(sale.customerId, entry);
  }

  return [...map.entries()]
    .map(([customerId, entry]) => {
      const customer = db.customers.find((c) => c.id === customerId);
      return {
        customerId,
        name: customer?.name ?? 'Removed customer',
        phone: customer?.phone ?? '—',
        visits: entry.visits,
        spent: round2(entry.spent),
        lastVisit: entry.last,
      };
    })
    .sort((a, b) => b.spent - a.spent)
    .slice(0, limit);
}

// ----------------------------------------------------------- product reports

export interface ProductReportRow {
  productId: string;
  name: string;
  brand: string;
  unitsSold: number;
  revenue: number;
  stock: number;
  status: ReturnType<typeof stockStatus>;
}

export function productReport(shopId: string | null, period: Period): ProductReportRow[] {
  const db = read();
  const sales = salesIn(shopId, period);
  const map = new Map<string, { units: number; revenue: number }>();

  for (const sale of sales) {
    for (const item of sale.items) {
      if (item.kind !== 'product') continue;
      const entry = map.get(item.refId) ?? { units: 0, revenue: 0 };
      entry.units += item.quantity;
      entry.revenue += item.lineTotal;
      map.set(item.refId, entry);
    }
  }

  return scopeTo(db.products, shopId)
    .filter((p) => p.active)
    .map((product) => {
      const entry = map.get(product.id) ?? { units: 0, revenue: 0 };
      return {
        productId: product.id,
        name: product.name,
        brand: product.brand,
        unitsSold: entry.units,
        revenue: round2(entry.revenue),
        stock: product.stock,
        status: stockStatus(product),
      };
    })
    .sort((a, b) => b.unitsSold - a.unitsSold);
}

// -------------------------------------------------------------- shop compare

export interface ShopComparisonRow {
  shopId: string;
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
  bills: number;
  appointments: number;
  completionRate: number;
  averageBill: number;
}

export function shopComparison(period: Period): ShopComparisonRow[] {
  return read().shops.map((shop) => {
    const sales = salesIn(shop.id, period);
    const appointments = appointmentsIn(shop.id, period);
    const revenue = round2(sales.reduce((sum, s) => sum + s.total, 0));
    const expenses = totalBetween(shop.id, period.from, period.to);
    const completed = appointments.filter((a) => a.status === 'completed').length;

    return {
      shopId: shop.id,
      name: shop.name,
      revenue,
      expenses,
      profit: round2(revenue - expenses),
      bills: sales.length,
      appointments: appointments.length,
      completionRate: appointments.length > 0 ? round2((completed / appointments.length) * 100) : 0,
      averageBill: sales.length > 0 ? round2(revenue / sales.length) : 0,
    };
  });
}

// --------------------------------------------------------- financial summary

export interface FinancialSummary {
  revenue: number;
  serviceRevenue: number;
  productRevenue: number;
  discountsGiven: number;
  taxCollected: number;
  refunds: number;
  expenses: number;
  netProfit: number;
  marginPct: number;
}

export function financialSummary(shopId: string | null, period: Period): FinancialSummary {
  const sales = salesIn(shopId, period);
  const revenue = round2(sales.reduce((sum, s) => sum + s.total, 0));

  let serviceRevenue = 0;
  let productRevenue = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      if (item.kind === 'product') productRevenue += item.lineTotal;
      else serviceRevenue += item.lineTotal;
    }
  }

  const refunds = round2(
    scopeTo(read().sales, shopId)
      .filter((s) => s.status === 'refunded' && s.refundedAt && within(s.refundedAt, period))
      .reduce((sum, s) => sum + s.total, 0),
  );

  const expenses = totalBetween(shopId, period.from, period.to);
  const netProfit = round2(revenue - expenses - refunds);

  return {
    revenue,
    serviceRevenue: round2(serviceRevenue),
    productRevenue: round2(productRevenue),
    discountsGiven: round2(
      sales.reduce((sum, s) => sum + s.billDiscount + s.membershipDiscount + s.itemDiscountTotal, 0),
    ),
    taxCollected: round2(sales.reduce((sum, s) => sum + s.taxAmount, 0)),
    refunds,
    expenses,
    netProfit,
    marginPct: revenue > 0 ? round2((netProfit / revenue) * 100) : 0,
  };
}

export function staffReport(shopId: string | null, period: Period): StaffPerformance[] {
  return staffPerformance(shopId, period.from, period.to)
    .filter((row) => row.completed > 0 || row.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);
}

/** Revenue for the last N days, for dashboard sparklines. */
export function recentRevenue(shopId: string | null, days = 14): SeriesPoint[] {
  const to = endOfDay(new Date());
  const from = startOfDay(subDays(to, days - 1));
  return revenueSeries(shopId, { from, to }, 'day');
}
