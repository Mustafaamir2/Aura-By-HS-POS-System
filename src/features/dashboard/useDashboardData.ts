import { useMemo } from 'react';
import { isSameDay, parseISO } from 'date-fns';
import { useDb } from '@/hooks/useDb';
import { useShopScope } from '@/hooks/useShopScope';
import { scopeTo } from '@/services/db';
import { stockStatus } from '@/services/inventoryService';
import {
  kpis,
  periodFor,
  previousPeriod,
  type KpiSet,
  type Period,
} from '@/services/reportService';
import { deltaPct } from '@/utils/money';
import type { Appointment, Customer, Product, Service, Staff } from '@/types';
import type { TimelineRow } from './components/TodayTimeline';

export interface DashboardData {
  today: Date;
  period: Period;
  kpi: KpiSet;
  /** Percentage change against the equivalent previous window. */
  revenueDelta: number | null;
  appointmentsDelta: number | null;
  todayRows: TimelineRow[];
  upcomingToday: TimelineRow[];
  nextUp: TimelineRow | null;
  activeStaff: Staff[];
  onDutyToday: Staff[];
  lowStock: Product[];
  totalCustomers: number;
  pendingConfirmations: Appointment[];
  recentNoShows: Appointment[];
}

/**
 * Everything both dashboards need, computed from the live tables. Reading
 * through `useDb` means a sale or a status change anywhere re-renders these
 * figures without any manual refresh.
 */
export function useDashboardData(): DashboardData {
  const db = useDb();
  const { shopId } = useShopScope();

  return useMemo(() => {
    const today = new Date();
    const period = periodFor('day', today);

    const appointments = scopeTo(db.appointments, shopId);
    const customers = scopeTo(db.customers, shopId) as Customer[];
    const staff = scopeTo(db.staff, shopId);
    const products = scopeTo(db.products, shopId);

    const serviceById = new Map<string, Service>(db.services.map((s) => [s.id, s]));
    const customerById = new Map(customers.map((c) => [c.id, c]));
    const staffById = new Map(staff.map((s) => [s.id, s]));

    const toRow = (appointment: Appointment): TimelineRow => ({
      appointment,
      customer: customerById.get(appointment.customerId),
      staff: staffById.get(appointment.staffId),
      services: appointment.services
        .map((s) => serviceById.get(s.serviceId))
        .filter((s): s is Service => Boolean(s)),
    });

    const todayAppointments = appointments
      .filter((a) => isSameDay(parseISO(a.startAt), today))
      .sort((a, b) => a.startAt.localeCompare(b.startAt));

    const todayRows = todayAppointments.map(toRow);

    const upcomingToday = todayRows.filter(
      (row) =>
        parseISO(row.appointment.startAt).getTime() >= Date.now() &&
        row.appointment.status !== 'cancelled' &&
        row.appointment.status !== 'no-show' &&
        row.appointment.status !== 'completed',
    );

    const weekday = today.getDay();
    const isoToday = today.toISOString().slice(0, 10);

    const current = kpis(shopId, period);
    const prior = kpis(shopId, previousPeriod(period));

    return {
      today,
      period,
      kpi: current,
      revenueDelta: deltaPct(current.revenue, prior.revenue),
      appointmentsDelta: deltaPct(current.appointmentsTotal, prior.appointmentsTotal),
      todayRows,
      upcomingToday,
      nextUp: upcomingToday[0] ?? null,
      activeStaff: staff.filter((s) => s.active),
      onDutyToday: staff.filter((member) => {
        if (!member.active || member.timeOff.includes(isoToday)) return false;
        return Boolean(member.schedule.find((s) => s.weekday === weekday)?.working);
      }),
      lowStock: products
        .filter((p) => p.active && stockStatus(p) !== 'in-stock')
        .sort((a, b) => a.stock - b.stock),
      totalCustomers: customers.length,
      pendingConfirmations: appointments.filter(
        (a) => a.status === 'pending' && parseISO(a.startAt).getTime() > Date.now(),
      ),
      recentNoShows: appointments.filter(
        (a) =>
          a.status === 'no-show' &&
          Date.now() - parseISO(a.startAt).getTime() < 7 * 86400000,
      ),
    };
  }, [db, shopId]);
}
