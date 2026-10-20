import type { AppointmentStatus } from '@/types';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'checked-in',
  'in-progress',
  'completed',
  'cancelled',
  'no-show',
];

export type ToneName = 'neutral' | 'info' | 'brand' | 'ok' | 'warn' | 'danger';

interface StatusMeta {
  label: string;
  tone: ToneName;
  /** Short description shown in the status-change menu. */
  hint: string;
}

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  pending: { label: 'Pending', tone: 'warn', hint: 'Booked, awaiting confirmation' },
  confirmed: { label: 'Confirmed', tone: 'info', hint: 'Customer confirmed the slot' },
  'checked-in': { label: 'Checked In', tone: 'brand', hint: 'Customer has arrived' },
  'in-progress': { label: 'In Progress', tone: 'brand', hint: 'Service under way' },
  completed: { label: 'Completed', tone: 'ok', hint: 'Service finished' },
  cancelled: { label: 'Cancelled', tone: 'danger', hint: 'Called off before the slot' },
  'no-show': { label: 'No Show', tone: 'danger', hint: 'Customer never arrived' },
};

/**
 * The only status moves the UI will offer or accept. Terminal states have no
 * outgoing edges, so a cancelled appointment can never be completed.
 */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'checked-in', 'cancelled', 'no-show'],
  confirmed: ['checked-in', 'in-progress', 'cancelled', 'no-show'],
  'checked-in': ['in-progress', 'completed', 'cancelled', 'no-show'],
  'in-progress': ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  'no-show': [],
};

export function allowedTransitions(from: AppointmentStatus): AppointmentStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: AppointmentStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** Cancelled and no-show slots free the stylist back up for other bookings. */
export function blocksAvailability(status: AppointmentStatus): boolean {
  return status !== 'cancelled' && status !== 'no-show';
}

/** Only these count as delivered work in revenue and staff performance. */
export function countsAsVisit(status: AppointmentStatus): boolean {
  return status === 'completed';
}

export function transitionError(from: AppointmentStatus, to: AppointmentStatus): string {
  const fromLabel = APPOINTMENT_STATUS_META[from].label;
  const toLabel = APPOINTMENT_STATUS_META[to].label;
  if (isTerminal(from)) {
    return `This appointment is ${fromLabel.toLowerCase()} and can no longer be changed.`;
  }
  return `An appointment cannot go from ${fromLabel} to ${toLabel}.`;
}
