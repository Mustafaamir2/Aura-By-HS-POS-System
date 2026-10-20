import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Scissors } from 'lucide-react';
import type { Appointment, Service } from '@/types';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/money';
import { atTime, formatDuration, toISODate } from '@/utils/date';
import { useDb } from '@/hooks/useDb';
import { useAuthStore } from '@/store/authStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import * as appointmentService from '@/services/appointmentService';
import { effectivePrice } from '@/services/catalogService';
import {
  dayBlockReason,
  getAvailableSlots,
  isQualified,
  SLOT_REASON_LABEL,
} from '@/services/availability';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { CustomerFormModal } from '@/features/customers/CustomerFormModal';

export interface AppointmentFormModalProps {
  open: boolean;
  onClose: () => void;
  shopId: string;
  /** Pass an appointment to edit or reschedule. */
  appointment?: Appointment | null;
  /** Preselect a customer, e.g. when booking from a customer's profile. */
  initialCustomerId?: string | null;
  initialDate?: Date;
  onSaved?: (appointment: Appointment) => void;
}

export function AppointmentFormModal({
  open,
  onClose,
  shopId,
  appointment,
  initialCustomerId,
  initialDate,
  onSaved,
}: AppointmentFormModalProps): JSX.Element {
  const db = useDb();
  const actor = useAuthStore((s) => s.user);
  const isEdit = Boolean(appointment);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(toISODate(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  // Load the record being edited, or reset to a blank booking.
  useEffect(() => {
    if (!open) return;
    if (appointment) {
      const start = new Date(appointment.startAt);
      setCustomerId(appointment.customerId);
      setServiceIds(appointment.services.map((s) => s.serviceId));
      setStaffId(appointment.staffId);
      setDate(toISODate(start));
      setTime(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
      setNotes(appointment.notes);
    } else {
      setCustomerId(initialCustomerId ?? null);
      setServiceIds([]);
      setStaffId(null);
      setDate(toISODate(initialDate ?? new Date()));
      setTime(null);
      setNotes('');
    }
  }, [open, appointment, initialCustomerId, initialDate]);

  const shop = db.shops.find((s) => s.id === shopId);
  const customers = useMemo(
    () => db.customers.filter((c) => c.shopId === shopId && c.active),
    [db.customers, shopId],
  );

  const selectedServices = useMemo(
    () =>
      serviceIds
        .map((id) => db.services.find((s) => s.id === id))
        .filter((s): s is Service => Boolean(s)),
    [serviceIds, db.services],
  );

  const duration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const price = selectedServices.reduce((sum, s) => sum + effectivePrice(s), 0);

  /** Only stylists at this branch who can do everything selected. */
  const eligibleStaff = useMemo(
    () =>
      db.staff.filter(
        (s) => s.shopId === shopId && s.active && s.specializations.length > 0 && isQualified(s, selectedServices),
      ),
    [db.staff, shopId, selectedServices],
  );

  // Drop a stylist who can no longer do the chosen combination.
  useEffect(() => {
    if (staffId && !eligibleStaff.some((s) => s.id === staffId)) {
      setStaffId(null);
      setTime(null);
    }
  }, [eligibleStaff, staffId]);

  const staff = eligibleStaff.find((s) => s.id === staffId) ?? null;
  const selectedDate = useMemo(() => new Date(`${date}T00:00:00`), [date]);

  const { slots, dayMessage } = useMemo(() => {
    if (!staff || !shop || selectedServices.length === 0) {
      return { slots: [], dayMessage: null };
    }

    const blocked = dayBlockReason(selectedDate, staff, shop, selectedServices);
    if (blocked) return { slots: [], dayMessage: SLOT_REASON_LABEL[blocked] };

    return {
      slots: getAvailableSlots({
        date: selectedDate,
        staff,
        shop,
        appointments: db.appointments.filter((a) => a.shopId === shopId),
        selectedServices,
        rules: db.settings.appointments,
        excludeAppointmentId: appointment?.id,
      }),
      dayMessage: null,
    };
  }, [staff, shop, selectedDate, selectedServices, db.appointments, db.settings.appointments, shopId, appointment?.id]);

  // A slot that was valid a moment ago may no longer be; never keep a stale pick.
  useEffect(() => {
    if (time && !slots.some((s) => s.time === time && s.available)) setTime(null);
  }, [slots, time]);

  const save = useAsyncAction(
    async () => {
      if (!actor) throw new Error('You must be signed in to book an appointment.');
      if (!customerId) throw new Error('Choose a customer for this appointment.');
      if (selectedServices.length === 0) throw new Error('Choose at least one service.');
      if (!staffId) throw new Error('Choose a stylist.');
      if (!time) throw new Error('Choose an available time slot.');

      const startAt = atTime(selectedDate, time).toISOString();
      const payload = { shopId, customerId, staffId, serviceIds, startAt, notes };

      return appointment
        ? appointmentService.update(appointment.id, payload, actor)
        : appointmentService.create(payload, actor);
    },
    {
      successMessage: isEdit ? 'Appointment updated.' : 'Appointment booked.',
      onSuccess: (saved) => {
        onSaved?.(saved);
        onClose();
      },
    },
  );

  const toggleService = (serviceId: string): void => {
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
    // The duration changed, so any chosen slot must be re-picked.
    setTime(null);
  };

  const categories = useMemo(
    () =>
      db.serviceCategories
        .filter((c) => c.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => ({
          category,
          services: db.services.filter((s) => s.categoryId === category.id && s.active),
        }))
        .filter((group) => group.services.length > 0),
    [db.serviceCategories, db.services],
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        dismissible={!save.pending}
        title={isEdit ? 'Edit appointment' : 'New appointment'}
        description={
          isEdit
            ? 'Change the services, stylist or time. Availability is rechecked on save.'
            : 'Only times the stylist can actually take are offered.'
        }
        footer={
          <>
            <Button variant="outline" onClick={onClose} disabled={save.pending}>
              Cancel
            </Button>
            <Button
              loading={save.pending}
              disabled={!customerId || !staffId || !time || selectedServices.length === 0}
              onClick={() => void save.run()}
            >
              {isEdit ? 'Save changes' : 'Book appointment'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* ---- Customer ---- */}
          <SearchableSelect
            label="Customer"
            required
            placeholder="Search by name or phone…"
            searchPlaceholder="Type a name or number…"
            value={customerId}
            onChange={setCustomerId}
            options={customers.map((c) => ({
              value: c.id,
              label: c.name,
              description: c.phone,
              keywords: c.email ?? '',
            }))}
            onCreate={(query) => {
              setNewCustomerName(query);
              setShowCustomerForm(true);
            }}
            createLabel="Add a new customer"
          />

          {/* ---- Services ---- */}
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink">
              Services <span className="text-danger">*</span>
            </p>

            <div className="max-h-56 space-y-3 overflow-y-auto rounded-xl border border-line p-3">
              {categories.map(({ category, services }) => (
                <div key={category.id}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">
                    {category.name}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {services.map((service) => {
                      const selected = serviceIds.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleService(service.id)}
                          className={cn(
                            'rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors',
                            selected
                              ? 'border-brand bg-brand text-brand-ink'
                              : 'border-line bg-surface text-ink hover:border-brand hover:bg-brand-soft',
                          )}
                        >
                          <span className="block font-medium">{service.name}</span>
                          <span
                            className={cn(
                              'block tabular-nums',
                              selected ? 'text-brand-ink/70' : 'text-subtle',
                            )}
                          >
                            {formatDuration(service.durationMin)} · {formatCurrency(effectivePrice(service))}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {selectedServices.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-[13px]">
                <Scissors className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                <span className="text-brand">
                  {selectedServices.length} {selectedServices.length === 1 ? 'service' : 'services'}
                </span>
                <span className="text-brand/60">·</span>
                <span className="inline-flex items-center gap-1 text-brand">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {formatDuration(duration)}
                </span>
                <span className="ml-auto font-semibold tabular-nums text-brand">
                  {formatCurrency(price)}
                </span>
              </div>
            )}
          </div>

          {/* ---- Stylist + date ---- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableSelect
              label="Stylist"
              required
              placeholder={
                selectedServices.length === 0 ? 'Choose services first' : 'Select a stylist…'
              }
              disabled={selectedServices.length === 0}
              value={staffId}
              onChange={(value) => {
                setStaffId(value);
                setTime(null);
              }}
              options={eligibleStaff.map((s) => ({
                value: s.id,
                label: s.name,
                description: s.role,
              }))}
              emptyMessage="No stylist here is qualified for that combination"
              hint={
                selectedServices.length > 0 && eligibleStaff.length === 0
                  ? undefined
                  : 'Only stylists qualified for the selected services are listed.'
              }
              error={
                selectedServices.length > 0 && eligibleStaff.length === 0
                  ? 'Nobody at this branch performs all of those services together.'
                  : undefined
              }
            />

            <DatePicker
              label="Date"
              required
              value={date}
              min={toISODate(new Date())}
              onChange={(e) => {
                setDate(e.target.value);
                setTime(null);
              }}
            />
          </div>

          {/* ---- Slots ---- */}
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink">
              Available times <span className="text-danger">*</span>
            </p>

            {!staff || selectedServices.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-subtle">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                Choose the services and a stylist to see when they are free.
              </div>
            ) : (
              <TimeSlotPicker
                slots={slots}
                value={time}
                onChange={setTime}
                dayMessage={dayMessage}
              />
            )}
          </div>

          {time && staff && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2.5 text-[13px]">
              <Badge tone="brand">Booking</Badge>
              <span className="text-ink">
                {staff.name} · {formatDuration(duration)} · finishes around{' '}
                {new Date(atTime(selectedDate, time).getTime() + duration * 60000).toLocaleTimeString(
                  undefined,
                  { hour: 'numeric', minute: '2-digit' },
                )}
              </span>
            </div>
          )}

          <Textarea
            label="Notes (optional)"
            placeholder="Anything the stylist should know before the appointment"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Modal>

      <CustomerFormModal
        open={showCustomerForm}
        onClose={() => setShowCustomerForm(false)}
        shopId={shopId}
        initialName={newCustomerName}
        onSaved={(created) => setCustomerId(created.id)}
      />
    </>
  );
}
