import {
  addMinutes,
  differenceInMinutes,
  format,
  formatDistanceToNowStrict,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
  parse,
  parseISO,
  startOfDay,
} from 'date-fns';
import type { ClockTime, Weekday } from '@/types';

export const ISO_DATE = 'yyyy-MM-dd';

export function toISODate(date: Date | string): string {
  return format(asDate(date), ISO_DATE);
}

export function asDate(value: Date | string): Date {
  return typeof value === 'string' ? parseISO(value) : value;
}

export function weekdayOf(value: Date | string): Weekday {
  return asDate(value).getDay() as Weekday;
}

/** "HH:mm" -> minutes since midnight. Returns 0 for malformed input. */
export function clockToMinutes(time: ClockTime): number {
  const [h, m] = time.split(':');
  const hours = Number(h);
  const mins = Number(m);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return 0;
  return hours * 60 + mins;
}

/** Minutes since midnight -> "HH:mm". Values past 24h wrap for display safety. */
export function minutesToClock(minutes: number): ClockTime {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Combine a calendar day with a wall-clock time into a real Date. */
export function atTime(day: Date | string, time: ClockTime): Date {
  return addMinutes(startOfDay(asDate(day)), clockToMinutes(time));
}

export function formatTime(value: Date | string): string {
  return format(asDate(value), 'h:mm a');
}

export function formatClock(time: ClockTime): string {
  return format(parse(time, 'HH:mm', new Date()), 'h:mm a');
}

export function formatDate(value: Date | string): string {
  return format(asDate(value), 'd MMM yyyy');
}

export function formatDateShort(value: Date | string): string {
  return format(asDate(value), 'd MMM');
}

export function formatDateTime(value: Date | string): string {
  return format(asDate(value), 'd MMM yyyy, h:mm a');
}

/** "Today, 3:00 PM" / "Tomorrow, 9:30 AM" / "12 Mar, 4:00 PM" */
export function formatFriendlyDateTime(value: Date | string): string {
  const d = asDate(value);
  const time = format(d, 'h:mm a');
  if (isToday(d)) return `Today, ${time}`;
  if (isTomorrow(d)) return `Tomorrow, ${time}`;
  if (isYesterday(d)) return `Yesterday, ${time}`;
  return `${format(d, 'd MMM')}, ${time}`;
}

export function formatRelative(value: Date | string): string {
  return `${formatDistanceToNowStrict(asDate(value))} ago`;
}

/** "1h 30m" / "45m" — used for service and appointment durations. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function appointmentEnd(startAt: string, durationMin: number): Date {
  return addMinutes(parseISO(startAt), durationMin);
}

export { addMinutes, differenceInMinutes, isSameDay, isToday, startOfDay, parseISO, format };

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
