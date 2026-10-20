import type { Appointment, AppointmentService, AppointmentStatus, User } from '@/types';
import { uid } from '@/utils/id';
import { canTransition, transitionError } from '@/utils/appointmentStatus';
import { formatFriendlyDateTime } from '@/utils/date';
import { commit, delay, nowISO, read, requireRow, scopeTo, ServiceError, stamped } from './db';
import { validateBooking } from './availability';
import { raise } from './notificationService';

export interface AppointmentInput {
  shopId: string;
  customerId: string;
  staffId: string;
  serviceIds: string[];
  startAt: string;
  notes: string;
  status?: AppointmentStatus;
  source?: Appointment['source'];
}

export async function list(shopId: string | null): Promise<Appointment[]> {
  return delay(scopeTo(read().appointments, shopId));
}

export function listSync(shopId: string | null): Appointment[] {
  return scopeTo(read().appointments, shopId);
}

export async function getById(id: string): Promise<Appointment> {
  return delay(requireRow(read().appointments.find((a) => a.id === id), 'That appointment'));
}

/** Snapshot prices and durations so later catalogue edits never rewrite history. */
function resolveServices(serviceIds: string[]): AppointmentService[] {
  const catalogue = read().services;
  const resolved: AppointmentService[] = [];

  for (const id of serviceIds) {
    const service = catalogue.find((s) => s.id === id);
    if (!service) throw new ServiceError('One of the selected services no longer exists.', 'not-found');
    if (!service.active) {
      throw new ServiceError(`${service.name} is no longer offered and cannot be booked.`, 'validation');
    }
    resolved.push({
      serviceId: service.id,
      price: Math.round(service.price * (1 - service.discountPct / 100)),
      durationMin: service.durationMin,
    });
  }

  if (resolved.length === 0) {
    throw new ServiceError('Choose at least one service before booking.', 'validation');
  }
  return resolved;
}

/**
 * Re-runs the full availability check at write time. The slot picker already
 * filtered the options, but minutes pass between choosing and submitting and
 * another user may have taken the slot, so this is the real gate.
 */
function assertSlotFree(
  input: { shopId: string; staffId: string; serviceIds: string[]; startAt: string },
  excludeAppointmentId?: string,
): void {
  const db = read();
  const staff = requireRow(db.staff.find((s) => s.id === input.staffId), 'That stylist');
  const shop = requireRow(db.shops.find((s) => s.id === input.shopId), 'That branch');

  if (staff.shopId !== shop.id) {
    throw new ServiceError('That stylist does not work at this branch.', 'validation');
  }

  const selectedServices = input.serviceIds
    .map((id) => db.services.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const check = validateBooking({
    startAt: new Date(input.startAt),
    staff,
    shop,
    appointments: db.appointments.filter((a) => a.shopId === input.shopId),
    selectedServices,
    rules: db.settings.appointments,
    excludeAppointmentId,
  });

  if (!check.ok) {
    throw new ServiceError(
      check.message ?? 'That time slot is no longer available. Please pick another.',
      'conflict',
    );
  }
}

export async function create(input: AppointmentInput, actor: User): Promise<Appointment> {
  assertSlotFree(input);
  const services = resolveServices(input.serviceIds);
  const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);
  const status = input.status ?? 'pending';

  const row: Appointment = stamped({
    id: uid('apt'),
    shopId: input.shopId,
    customerId: input.customerId,
    staffId: input.staffId,
    services,
    startAt: input.startAt,
    durationMin,
    status,
    notes: input.notes.trim(),
    cancelReason: null,
    history: [
      {
        status,
        at: nowISO(),
        byUserId: actor.id,
        byUserName: actor.name,
        note: null,
      },
    ],
    saleId: null,
    source: input.source ?? 'front-desk',
  });

  const saved = await commit((db) => {
    db.appointments = [...db.appointments, row];
    return row;
  });

  const customer = read().customers.find((c) => c.id === saved.customerId);
  raise({
    shopId: saved.shopId,
    type: 'appointment-created',
    title: 'New appointment booked',
    message: `${customer?.name ?? 'A customer'} is booked for ${formatFriendlyDateTime(saved.startAt)}.`,
    link: `/appointments?id=${saved.id}`,
  });

  return saved;
}

export async function update(
  id: string,
  input: Omit<AppointmentInput, 'status'>,
  actor: User,
): Promise<Appointment> {
  const existing = requireRow(read().appointments.find((a) => a.id === id), 'That appointment');
  const rescheduled = existing.startAt !== input.startAt || existing.staffId !== input.staffId;

  assertSlotFree(input, id);
  const services = resolveServices(input.serviceIds);
  const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);

  const next = await commit((db) => {
    const updated: Appointment = {
      ...existing,
      customerId: input.customerId,
      staffId: input.staffId,
      services,
      startAt: input.startAt,
      durationMin,
      notes: input.notes.trim(),
      updatedAt: nowISO(),
      history: rescheduled
        ? [
            ...existing.history,
            {
              status: existing.status,
              at: nowISO(),
              byUserId: actor.id,
              byUserName: actor.name,
              note: `Rescheduled to ${formatFriendlyDateTime(input.startAt)}`,
            },
          ]
        : existing.history,
    };
    db.appointments = db.appointments.map((a) => (a.id === id ? updated : a));
    return updated;
  });

  if (rescheduled) {
    const customer = read().customers.find((c) => c.id === next.customerId);
    raise({
      shopId: next.shopId,
      type: 'appointment-rescheduled',
      title: 'Appointment rescheduled',
      message: `${customer?.name ?? 'A customer'} moved to ${formatFriendlyDateTime(next.startAt)}.`,
      link: `/appointments?id=${next.id}`,
    });
  }

  return next;
}

/** The only path by which a status may change. Invalid moves are refused. */
export async function changeStatus(
  id: string,
  to: AppointmentStatus,
  actor: User,
  note?: string,
): Promise<Appointment> {
  const existing = requireRow(read().appointments.find((a) => a.id === id), 'That appointment');

  if (existing.status === to) return existing;
  if (!canTransition(existing.status, to)) {
    throw new ServiceError(transitionError(existing.status, to), 'validation');
  }
  if (to === 'cancelled' && !note?.trim()) {
    throw new ServiceError('A reason is required when cancelling an appointment.', 'validation');
  }

  const next = await commit((db) => {
    const updated: Appointment = {
      ...existing,
      status: to,
      cancelReason: to === 'cancelled' ? (note?.trim() ?? null) : existing.cancelReason,
      updatedAt: nowISO(),
      history: [
        ...existing.history,
        {
          status: to,
          at: nowISO(),
          byUserId: actor.id,
          byUserName: actor.name,
          note: note?.trim() || null,
        },
      ],
    };
    db.appointments = db.appointments.map((a) => (a.id === id ? updated : a));
    return updated;
  });

  const customer = read().customers.find((c) => c.id === next.customerId);
  const who = customer?.name ?? 'A customer';

  if (to === 'cancelled') {
    raise({
      shopId: next.shopId,
      type: 'appointment-cancelled',
      title: 'Appointment cancelled',
      message: `${who}'s ${formatFriendlyDateTime(next.startAt)} slot was cancelled. ${note ?? ''}`.trim(),
      link: `/appointments?id=${next.id}`,
    });
  } else if (to === 'no-show') {
    raise({
      shopId: next.shopId,
      type: 'appointment-no-show',
      title: 'Customer did not arrive',
      message: `${who} missed their ${formatFriendlyDateTime(next.startAt)} slot.`,
      link: `/appointments?id=${next.id}`,
    });
  }

  return next;
}

/** Marks the appointment as billed. Called by the sale service, not the UI. */
export function attachSale(appointmentId: string, saleId: string): void {
  const existing = read().appointments.find((a) => a.id === appointmentId);
  if (!existing) return;
  commit((db) => {
    db.appointments = db.appointments.map((a) =>
      a.id === appointmentId ? { ...a, saleId, updatedAt: nowISO() } : a,
    );
  });
}

export async function remove(id: string): Promise<void> {
  const existing = requireRow(read().appointments.find((a) => a.id === id), 'That appointment');
  if (existing.saleId) {
    throw new ServiceError(
      'This appointment has a bill against it and cannot be deleted. Cancel it instead.',
      'conflict',
    );
  }
  await commit((db) => {
    db.appointments = db.appointments.filter((a) => a.id !== id);
  });
}
