import { addDays, addMinutes, startOfDay } from 'date-fns';
import type {
  Appointment,
  AppointmentService,
  AppointmentStatus,
  Customer,
  Service,
  Staff,
  Weekday,
} from '@/types';
import { clockToMinutes, toISODate } from '@/utils/date';
import { makeRng } from '@/utils/random';
import { services as allServices } from './catalog';
import { shops } from './shops';
import { staff as allStaff } from './staff';

const NOW = '2026-01-05T09:00:00.000Z';

/**
 * Roughly two months back and a fortnight forward. Enough history for the
 * reports to be interesting, while keeping the whole dataset comfortably
 * inside the browser's localStorage quota.
 */
const PAST_DAYS = 45;
const FUTURE_DAYS = 14;

/** Services that are commonly booked together, so histories look human. */
const COMBOS: string[][] = [
  ['svc_0001'],
  ['svc_0001', 'svc_0004'],
  ['svc_0002'],
  ['svc_0004'],
  ['svc_0005'],
  ['svc_0006'],
  ['svc_0010', 'svc_0011'],
  ['svc_0013'],
  ['svc_0014'],
  ['svc_0017'],
  ['svc_0021'],
  ['svc_0022'],
  ['svc_0021', 'svc_0022'],
  ['svc_0024'],
  ['svc_0028'],
  ['svc_0033', 'svc_0039'],
  ['svc_0034'],
  ['svc_0036'],
  ['svc_0036', 'svc_0037'],
  ['svc_0038', 'svc_0019'],
];

const COMBO_WEIGHTS = [9, 5, 7, 6, 3, 4, 3, 6, 5, 3, 6, 6, 3, 5, 2, 4, 3, 8, 4, 3];

interface Booking {
  staffId: string;
  startMin: number;
  endMin: number;
}

function serviceById(id: string): Service | undefined {
  return allServices.find((s) => s.id === id);
}

/** The price a service carries at booking time, after its own discount. */
function effectivePrice(service: Service): number {
  return Math.round(service.price * (1 - service.discountPct / 100));
}

/**
 * Decide a plausible status from how far the appointment is from now.
 * Past slots resolve; future slots stay pending or confirmed.
 */
function statusFor(start: Date, now: Date, roll: number): AppointmentStatus {
  const isPast = start.getTime() < now.getTime();
  if (!isPast) {
    if (roll < 0.62) return 'confirmed';
    return 'pending';
  }
  // Within the last two hours, some are still on the floor.
  const minutesAgo = (now.getTime() - start.getTime()) / 60000;
  if (minutesAgo < 45) {
    if (roll < 0.35) return 'in-progress';
    if (roll < 0.6) return 'checked-in';
    return 'completed';
  }
  if (roll < 0.83) return 'completed';
  if (roll < 0.92) return 'cancelled';
  return 'no-show';
}

const CANCEL_REASONS = [
  'Customer had a scheduling clash.',
  'Unwell, rebooking next week.',
  'Traffic — could not make it in time.',
  'Stylist called in sick, slot released.',
  'Customer cancelled over the phone.',
];

const NOTE_POOL = [
  'Requested the same shade as last time.',
  'Bringing a friend, may add a service.',
  'Wants to be out by 6pm sharp.',
  'Trial run before the wedding next month.',
  'Prefers minimal layers.',
  '',
  '',
  '',
  '',
];

export function buildAppointments(
  today: Date,
  customers: Customer[],
  staffRows: Staff[] = allStaff,
): Appointment[] {
  const rng = makeRng(31337);
  const out: Appointment[] = [];
  let n = 0;

  const now = today;

  for (let offset = -PAST_DAYS; offset <= FUTURE_DAYS; offset += 1) {
    const day = startOfDay(addDays(today, offset));
    const weekday = day.getDay() as Weekday;
    const isoDay = toISODate(day);

    for (const shop of shops) {
      const hours = shop.businessHours.find((h) => h.weekday === weekday);
      if (!hours || hours.closed) continue;

      const shopOpen = clockToMinutes(hours.open);
      const shopClose = clockToMinutes(hours.close);

      const shopStaff = staffRows.filter(
        (s) => s.shopId === shop.id && s.active && s.specializations.length > 0,
      );
      const shopCustomers = customers.filter((c) => c.shopId === shop.id);
      if (shopStaff.length === 0 || shopCustomers.length === 0) continue;

      // Booked ranges per stylist for this day, so we never seed a clash.
      const taken: Booking[] = [];

      // Weekends run busier than midweek.
      const busyFactor = weekday === 6 || weekday === 0 ? 1.6 : 1;
      const perStaff = Math.round(rng.int(0, 2) * busyFactor);

      for (const member of shopStaff) {
        if (member.timeOff.includes(isoDay)) continue;
        const shift = member.schedule.find((s) => s.weekday === weekday);
        if (!shift || !shift.working) continue;

        const shiftStart = Math.max(clockToMinutes(shift.start), shopOpen);
        const shiftEnd = Math.min(clockToMinutes(shift.end), shopClose);
        const breakStart = shift.breakStart ? clockToMinutes(shift.breakStart) : null;
        const breakEnd = shift.breakEnd ? clockToMinutes(shift.breakEnd) : null;

        for (let attempt = 0; attempt < perStaff; attempt += 1) {
          // Only offer combos this member is actually qualified for.
          const eligible = COMBOS.map((combo, i) => ({ combo, weight: COMBO_WEIGHTS[i] ?? 1 })).filter(
            ({ combo }) => combo.every((id) => member.specializations.includes(id)),
          );
          if (eligible.length === 0) break;

          const chosen = rng.weighted(
            eligible.map((e) => e.combo),
            eligible.map((e) => e.weight),
          );

          const bookedServices: AppointmentService[] = [];
          for (const serviceId of chosen) {
            const service = serviceById(serviceId);
            if (!service || !service.active) continue;
            bookedServices.push({
              serviceId,
              price: effectivePrice(service),
              durationMin: service.durationMin,
            });
          }
          if (bookedServices.length === 0) continue;

          const duration = bookedServices.reduce((sum, s) => sum + s.durationMin, 0);

          // Try a handful of start times on a 15-minute grid before giving up.
          let startMin = -1;
          for (let tries = 0; tries < 14; tries += 1) {
            const latest = shiftEnd - duration;
            if (latest <= shiftStart) break;
            const candidate = shiftStart + Math.floor(rng.next() * ((latest - shiftStart) / 15)) * 15;
            const candidateEnd = candidate + duration;

            const hitsBreak =
              breakStart !== null && breakEnd !== null && candidate < breakEnd && candidateEnd > breakStart;
            if (hitsBreak) continue;

            const clashes = taken.some(
              (b) => b.staffId === member.id && candidate < b.endMin && candidateEnd > b.startMin,
            );
            if (clashes) continue;

            startMin = candidate;
            break;
          }
          if (startMin < 0) continue;

          taken.push({ staffId: member.id, startMin, endMin: startMin + duration });

          const start = addMinutes(day, startMin);
          const customer = rng.pick(shopCustomers);
          const status = statusFor(start, now, rng.next());

          n += 1;
          const createdAt = addMinutes(start, -rng.int(60, 60 * 24 * 9)).toISOString();
          const byUserName = 'Front Desk';

          const history = [
            {
              status: 'pending' as AppointmentStatus,
              at: createdAt,
              byUserId: 'usr_0001',
              byUserName,
              note: null,
            },
          ];
          if (status !== 'pending') {
            history.push({
              status,
              at: addMinutes(start, status === 'completed' ? duration : 0).toISOString(),
              byUserId: 'usr_0001',
              byUserName,
              note: null,
            });
          }

          out.push({
            id: `apt_${String(n).padStart(4, '0')}`,
            shopId: shop.id,
            createdAt,
            updatedAt: NOW,
            customerId: customer.id,
            staffId: member.id,
            services: bookedServices,
            startAt: start.toISOString(),
            durationMin: duration,
            status,
            notes: rng.pick(NOTE_POOL),
            cancelReason: status === 'cancelled' ? rng.pick(CANCEL_REASONS) : null,
            history,
            saleId: null, // linked later, when sales are generated
            source: rng.weighted(
              ['walk-in', 'phone', 'online', 'front-desk'] as const,
              [2, 4, 3, 2],
            ),
          });
        }
      }
    }
  }

  return out.sort((a, b) => a.startAt.localeCompare(b.startAt));
}
