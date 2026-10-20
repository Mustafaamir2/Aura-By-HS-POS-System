import { addMinutes, isSameDay, startOfDay } from 'date-fns';
import type {
  Appointment,
  AppointmentRules,
  Service,
  Shop,
  Staff,
  Weekday,
} from '@/types';
import { clockToMinutes, minutesToClock, toISODate } from '@/utils/date';
import { blocksAvailability } from '@/utils/appointmentStatus';

/**
 * Booking rules live here as pure functions so they can be reasoned about and
 * tested without a store, a component or a clock. Nothing in this file reads
 * global state; every input is passed in.
 *
 * A slot is offered only when ALL of these hold:
 *   - the shop is open that weekday, and the slot fits inside opening hours
 *   - the stylist is rostered on that weekday and not on leave
 *   - the slot fits inside the stylist's shift
 *   - the slot does not overlap the stylist's break
 *   - the slot does not overlap another appointment that still blocks the diary
 *   - the stylist is qualified for every selected service
 *   - the slot starts far enough in the future to satisfy the advance-notice rule
 */

export interface SlotRequest {
  /** Calendar day being viewed. */
  date: Date;
  staff: Staff;
  shop: Shop;
  /** Every appointment already in the diary for this stylist. Filtered internally. */
  appointments: Appointment[];
  /** Services the customer has selected, in booking order. */
  selectedServices: Service[];
  rules: AppointmentRules;
  /** Injected so tests can pin "now"; defaults to the real clock. */
  now?: Date;
  /** When rescheduling, the appointment being moved must not block itself. */
  excludeAppointmentId?: string;
}

export interface TimeSlot {
  /** "HH:mm" start of the slot. */
  time: string;
  start: Date;
  end: Date;
  available: boolean;
  /** Why the slot cannot be taken — shown as a tooltip on disabled slots. */
  reason: SlotBlockReason | null;
}

export type SlotBlockReason =
  | 'past'
  | 'too-soon'
  | 'outside-shop-hours'
  | 'outside-shift'
  | 'on-break'
  | 'booked'
  | 'day-off'
  | 'on-leave'
  | 'not-qualified'
  | 'shop-closed';

export const SLOT_REASON_LABEL: Record<SlotBlockReason, string> = {
  past: 'This time has already passed',
  'too-soon': 'Too soon — needs more advance notice',
  'outside-shop-hours': 'Outside the salon’s opening hours',
  'outside-shift': 'Outside this stylist’s shift',
  'on-break': 'The stylist is on a break',
  booked: 'Already booked',
  'day-off': 'The stylist is off on this day',
  'on-leave': 'The stylist is on leave',
  'not-qualified': 'This stylist does not perform the selected services',
  'shop-closed': 'The salon is closed on this day',
};

interface Interval {
  start: number;
  end: number;
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && a.end > b.start;
}

/** Total minutes the selected services occupy, back to back. */
export function totalDuration(selectedServices: Service[], fallbackMin = 0): number {
  const sum = selectedServices.reduce((total, s) => total + s.durationMin, 0);
  return sum > 0 ? sum : fallbackMin;
}

/** Sum of the selected services' prices, after each service's own discount. */
export function totalPrice(selectedServices: Service[]): number {
  return selectedServices.reduce(
    (total, s) => total + Math.round(s.price * (1 - s.discountPct / 100)),
    0,
  );
}

export function isQualified(staff: Staff, selectedServices: Service[]): boolean {
  if (selectedServices.length === 0) return true;
  return selectedServices.every((s) => staff.specializations.includes(s.id));
}

/** A blanket reason that rules out the whole day, or null if the day is workable. */
export function dayBlockReason(
  date: Date,
  staff: Staff,
  shop: Shop,
  selectedServices: Service[],
): SlotBlockReason | null {
  const weekday = date.getDay() as Weekday;

  const hours = shop.businessHours.find((h) => h.weekday === weekday);
  if (!hours || hours.closed) return 'shop-closed';

  if (staff.timeOff.includes(toISODate(date))) return 'on-leave';

  const shift = staff.schedule.find((s) => s.weekday === weekday);
  if (!shift || !shift.working) return 'day-off';

  if (!isQualified(staff, selectedServices)) return 'not-qualified';

  return null;
}

/**
 * The appointments that genuinely occupy this stylist on this day.
 * Cancelled and no-show slots are released back to the diary.
 */
export function busyIntervals(
  date: Date,
  staffId: string,
  appointments: Appointment[],
  excludeAppointmentId?: string,
): Interval[] {
  const dayStart = startOfDay(date);
  return appointments
    .filter((a) => a.staffId === staffId)
    .filter((a) => a.id !== excludeAppointmentId)
    .filter((a) => blocksAvailability(a.status))
    .filter((a) => isSameDay(new Date(a.startAt), date))
    .map((a) => {
      const start = new Date(a.startAt);
      const offset = Math.round((start.getTime() - dayStart.getTime()) / 60000);
      return { start: offset, end: offset + a.durationMin };
    })
    .sort((a, b) => a.start - b.start);
}

/**
 * Generate every slot on the grid for a stylist and day, each marked available
 * or not. Disabled slots are returned too, so the picker can explain itself
 * rather than silently showing an empty day.
 */
export function getAvailableSlots(request: SlotRequest): TimeSlot[] {
  const {
    date,
    staff,
    shop,
    appointments,
    selectedServices,
    rules,
    now = new Date(),
    excludeAppointmentId,
  } = request;

  const weekday = date.getDay() as Weekday;
  const dayStart = startOfDay(date);
  const duration = totalDuration(selectedServices, rules.defaultDurationMin);
  const interval = Math.max(5, rules.slotIntervalMin);

  const blanket = dayBlockReason(date, staff, shop, selectedServices);
  const hours = shop.businessHours.find((h) => h.weekday === weekday);
  const shift = staff.schedule.find((s) => s.weekday === weekday);

  // With no hours at all there is nothing to lay a grid over.
  if (!hours || hours.closed) return [];
  if (blanket === 'day-off' || blanket === 'on-leave' || !shift || !shift.working) return [];

  const shopOpen = clockToMinutes(hours.open);
  const shopClose = clockToMinutes(hours.close);
  const shiftStart = clockToMinutes(shift.start);
  const shiftEnd = clockToMinutes(shift.end);

  const breakInterval: Interval | null =
    shift.breakStart && shift.breakEnd
      ? { start: clockToMinutes(shift.breakStart), end: clockToMinutes(shift.breakEnd) }
      : null;

  const busy = busyIntervals(date, staff.id, appointments, excludeAppointmentId);
  const buffer = Math.max(0, rules.bufferMin);

  const earliestAllowed = addMinutes(now, Math.max(0, rules.minAdvanceBookingMin));

  const slots: TimeSlot[] = [];
  const gridStart = Math.max(shopOpen, shiftStart);
  const gridEnd = Math.min(shopClose, shiftEnd);

  for (let minute = gridStart; minute + duration <= gridEnd; minute += interval) {
    const candidate: Interval = { start: minute, end: minute + duration };
    const start = addMinutes(dayStart, minute);
    const end = addMinutes(start, duration);

    let reason: SlotBlockReason | null = null;

    if (blanket === 'not-qualified') {
      reason = 'not-qualified';
    } else if (start.getTime() < now.getTime()) {
      reason = 'past';
    } else if (start.getTime() < earliestAllowed.getTime()) {
      reason = 'too-soon';
    } else if (candidate.start < shopOpen || candidate.end > shopClose) {
      reason = 'outside-shop-hours';
    } else if (candidate.start < shiftStart || candidate.end > shiftEnd) {
      reason = 'outside-shift';
    } else if (breakInterval && overlaps(candidate, breakInterval)) {
      reason = 'on-break';
    } else if (
      busy.some((b) => overlaps(candidate, { start: b.start - buffer, end: b.end + buffer }))
    ) {
      reason = 'booked';
    }

    slots.push({
      time: minutesToClock(minute),
      start,
      end,
      available: reason === null,
      reason,
    });
  }

  return slots;
}

/** Just the bookable ones, for callers that do not want to render the rest. */
export function availableSlotsOnly(request: SlotRequest): TimeSlot[] {
  return getAvailableSlots(request).filter((s) => s.available);
}

export interface ConflictCheck {
  ok: boolean;
  reason: SlotBlockReason | null;
  message: string | null;
}

/**
 * Re-validates an exact start time. The slot picker narrows the choices, but
 * time passes and other users book, so submit must check again before writing.
 */
export function validateBooking(
  params: Omit<SlotRequest, 'date'> & { startAt: Date },
): ConflictCheck {
  const { startAt, staff, shop, appointments, selectedServices, rules, now = new Date(), excludeAppointmentId } = params;

  const ok = (): ConflictCheck => ({ ok: true, reason: null, message: null });
  const fail = (reason: SlotBlockReason): ConflictCheck => ({
    ok: false,
    reason,
    message: SLOT_REASON_LABEL[reason],
  });

  const blanket = dayBlockReason(startAt, staff, shop, selectedServices);
  if (blanket) return fail(blanket);

  const weekday = startAt.getDay() as Weekday;
  const hours = shop.businessHours.find((h) => h.weekday === weekday);
  const shift = staff.schedule.find((s) => s.weekday === weekday);
  if (!hours || hours.closed) return fail('shop-closed');
  if (!shift || !shift.working) return fail('day-off');

  const duration = totalDuration(selectedServices, rules.defaultDurationMin);
  const dayStart = startOfDay(startAt);
  const startMin = Math.round((startAt.getTime() - dayStart.getTime()) / 60000);
  const candidate: Interval = { start: startMin, end: startMin + duration };

  if (startAt.getTime() < now.getTime()) return fail('past');
  if (startAt.getTime() < addMinutes(now, rules.minAdvanceBookingMin).getTime()) {
    return fail('too-soon');
  }
  if (candidate.start < clockToMinutes(hours.open) || candidate.end > clockToMinutes(hours.close)) {
    return fail('outside-shop-hours');
  }
  if (candidate.start < clockToMinutes(shift.start) || candidate.end > clockToMinutes(shift.end)) {
    return fail('outside-shift');
  }
  if (shift.breakStart && shift.breakEnd) {
    const br = { start: clockToMinutes(shift.breakStart), end: clockToMinutes(shift.breakEnd) };
    if (overlaps(candidate, br)) return fail('on-break');
  }

  const buffer = Math.max(0, rules.bufferMin);
  const busy = busyIntervals(startAt, staff.id, appointments, excludeAppointmentId);
  if (busy.some((b) => overlaps(candidate, { start: b.start - buffer, end: b.end + buffer }))) {
    return fail('booked');
  }

  return ok();
}

/**
 * Which stylists could take this booking at all, used to filter the stylist
 * dropdown down to people who can actually do the work.
 */
export function qualifiedStaff(staffRows: Staff[], selectedServices: Service[]): Staff[] {
  return staffRows.filter((s) => s.active && isQualified(s, selectedServices));
}

/** True when the stylist has at least one open slot on this day. */
export function hasAnyAvailability(request: SlotRequest): boolean {
  return getAvailableSlots(request).some((s) => s.available);
}

/** The stylist's working window on a day, for rendering calendar lanes. */
export function shiftWindow(
  date: Date,
  staff: Staff,
  shop: Shop,
): { start: number; end: number } | null {
  const weekday = date.getDay() as Weekday;
  const hours = shop.businessHours.find((h) => h.weekday === weekday);
  const shift = staff.schedule.find((s) => s.weekday === weekday);
  if (!hours || hours.closed || !shift || !shift.working) return null;
  if (staff.timeOff.includes(toISODate(date))) return null;
  return {
    start: Math.max(clockToMinutes(hours.open), clockToMinutes(shift.start)),
    end: Math.min(clockToMinutes(hours.close), clockToMinutes(shift.end)),
  };
}
