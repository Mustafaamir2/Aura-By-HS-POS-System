import { useMemo } from 'react';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Appointment, Customer, Service, Staff } from '@/types';
import { cn } from '@/utils/cn';
import { format, formatTime, toISODate } from '@/utils/date';
import { APPOINTMENT_STATUS_META } from '@/utils/appointmentStatus';
import { EmptyState } from '@/components/ui/States';

export interface CalendarRow {
  appointment: Appointment;
  customer: Customer | undefined;
  staff: Staff | undefined;
  services: Service[];
}

interface ViewProps {
  rows: CalendarRow[];
  anchor: Date;
  onSelect: (appointment: Appointment) => void;
}

/** Tint per status, so the diary reads at a glance. */
const STATUS_TINT: Record<string, string> = {
  pending: 'border-l-warn bg-warn-soft/60',
  confirmed: 'border-l-info bg-info-soft/60',
  'checked-in': 'border-l-brand bg-brand-soft/70',
  'in-progress': 'border-l-brand bg-brand-soft',
  completed: 'border-l-ok bg-ok-soft/60',
  cancelled: 'border-l-danger bg-danger-soft/50 opacity-60',
  'no-show': 'border-l-danger bg-danger-soft/60 opacity-70',
};

const DAY_START_MIN = 8 * 60;
const DAY_END_MIN = 22 * 60;
const PIXELS_PER_MIN = 1.2;

// ---------------------------------------------------------------- Day view

/** A stylist-per-column grid, the way a paper day book is laid out. */
export function DayView({ rows, anchor, onSelect }: ViewProps): JSX.Element {
  const dayRows = rows.filter((row) => isSameDay(parseISO(row.appointment.startAt), anchor));

  const staffColumns = useMemo(() => {
    const map = new Map<string, Staff>();
    dayRows.forEach((row) => {
      if (row.staff) map.set(row.staff.id, row.staff);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [dayRows]);

  if (dayRows.length === 0) {
    return (
      <EmptyState
        title="Nothing booked on this day"
        description="Pick another date, or book someone in."
      />
    );
  }

  const hours: number[] = [];
  for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += 60) hours.push(m);

  const height = (DAY_END_MIN - DAY_START_MIN) * PIXELS_PER_MIN;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[640px]">
        {/* Hour gutter */}
        <div className="w-16 shrink-0 pt-8">
          {hours.map((minute) => (
            <div
              key={minute}
              className="relative text-right"
              style={{ height: 60 * PIXELS_PER_MIN }}
            >
              <span className="absolute -top-2 right-2 text-[11px] tabular-nums text-subtle">
                {format(new Date(2000, 0, 1, minute / 60), 'h a')}
              </span>
            </div>
          ))}
        </div>

        {/* Stylist columns */}
        <div className="flex flex-1 gap-2">
          {staffColumns.map((member) => (
            <div key={member.id} className="min-w-[140px] flex-1">
              <p className="mb-1 h-7 truncate text-center text-xs font-medium text-ink">
                {member.name}
              </p>

              <div
                className="relative rounded-xl border border-line bg-canvas/50"
                style={{ height }}
              >
                {/* Hour lines */}
                {hours.map((minute, index) => (
                  <div
                    key={minute}
                    className={cn('absolute inset-x-0 border-t border-line', index === 0 && 'border-t-0')}
                    style={{ top: (minute - DAY_START_MIN) * PIXELS_PER_MIN }}
                    aria-hidden
                  />
                ))}

                {dayRows
                  .filter((row) => row.appointment.staffId === member.id)
                  .map((row) => {
                    const start = parseISO(row.appointment.startAt);
                    const startMin = start.getHours() * 60 + start.getMinutes();
                    const top = (startMin - DAY_START_MIN) * PIXELS_PER_MIN;
                    const blockHeight = Math.max(28, row.appointment.durationMin * PIXELS_PER_MIN);

                    return (
                      <button
                        key={row.appointment.id}
                        type="button"
                        onClick={() => onSelect(row.appointment)}
                        style={{ top, height: blockHeight }}
                        className={cn(
                          'absolute inset-x-1 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left transition-shadow hover:shadow-lift',
                          STATUS_TINT[row.appointment.status],
                        )}
                      >
                        <span className="block truncate text-[11px] font-semibold text-ink">
                          {formatTime(start)}
                        </span>
                        <span className="block truncate text-[11px] text-ink">
                          {row.customer?.name ?? 'Unknown'}
                        </span>
                        {blockHeight > 52 && (
                          <span className="block truncate text-[10px] text-muted">
                            {row.services.map((s) => s.name).join(', ')}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- Week view

export function WeekView({ rows, anchor, onSelect }: ViewProps): JSX.Element {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end: endOfWeek(anchor, { weekStartsOn: 1 }) });
  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-7 gap-2">
        {days.map((day) => {
          const dayRows = rows
            .filter((row) => isSameDay(parseISO(row.appointment.startAt), day))
            .sort((a, b) => a.appointment.startAt.localeCompare(b.appointment.startAt));
          const isToday = isSameDay(day, today);

          return (
            <div key={day.toISOString()} className="min-w-0">
              <div
                className={cn(
                  'mb-2 rounded-lg px-2 py-1.5 text-center',
                  isToday ? 'bg-brand text-brand-ink' : 'bg-canvas',
                )}
              >
                <p className="text-[11px] font-medium opacity-80">{format(day, 'EEE')}</p>
                <p className="text-sm font-semibold tabular-nums">{format(day, 'd')}</p>
              </div>

              <div className="space-y-1.5">
                {dayRows.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-subtle">—</p>
                ) : (
                  dayRows.map((row) => (
                    <button
                      key={row.appointment.id}
                      type="button"
                      onClick={() => onSelect(row.appointment)}
                      className={cn(
                        'w-full overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 text-left transition-shadow hover:shadow-lift',
                        STATUS_TINT[row.appointment.status],
                      )}
                    >
                      <span className="block text-[11px] font-semibold tabular-nums text-ink">
                        {formatTime(row.appointment.startAt)}
                      </span>
                      <span className="block truncate text-[11px] text-ink">
                        {row.customer?.name ?? 'Unknown'}
                      </span>
                      <span className="block truncate text-[10px] text-muted">
                        {row.staff?.name ?? 'Unassigned'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- Month view

export function MonthView({
  rows,
  anchor,
  onSelect,
  onPickDay,
}: ViewProps & { onPickDay: (day: Date) => void }): JSX.Element {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });

  const days: Date[] = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) days.push(day);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarRow[]>();
    rows.forEach((row) => {
      const key = toISODate(parseISO(row.appointment.startAt));
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    });
    map.forEach((list) => list.sort((a, b) => a.appointment.startAt.localeCompare(b.appointment.startAt)));
    return map;
  }, [rows]);

  const today = new Date();

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1.5">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
          <p key={label} className="py-1 text-center text-[11px] font-medium text-subtle">
            {label}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const key = toISODate(day);
          const dayRows = byDay.get(key) ?? [];
          const outside = !isSameMonth(day, monthStart);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={key}
              className={cn(
                'min-h-[92px] rounded-xl border p-1.5',
                outside ? 'border-line/60 bg-canvas/40' : 'border-line bg-surface',
              )}
            >
              <button
                type="button"
                onClick={() => onPickDay(day)}
                className={cn(
                  'mb-1 grid h-6 w-6 place-items-center rounded-md text-[11px] font-medium tabular-nums transition-colors',
                  isToday
                    ? 'bg-brand text-brand-ink'
                    : outside
                      ? 'text-subtle hover:bg-line/50'
                      : 'text-ink hover:bg-line/50',
                )}
                aria-label={`View ${format(day, 'd MMMM')}`}
              >
                {day.getDate()}
              </button>

              <div className="space-y-1">
                {dayRows.slice(0, 3).map((row) => (
                  <button
                    key={row.appointment.id}
                    type="button"
                    onClick={() => onSelect(row.appointment)}
                    className={cn(
                      'block w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[10px] text-ink transition-colors hover:brightness-95',
                      STATUS_TINT[row.appointment.status],
                    )}
                    title={`${formatTime(row.appointment.startAt)} — ${row.customer?.name ?? 'Unknown'}`}
                  >
                    {format(parseISO(row.appointment.startAt), 'HH:mm')} {row.customer?.name ?? '—'}
                  </button>
                ))}

                {dayRows.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onPickDay(day)}
                    className="w-full px-1 text-left text-[10px] font-medium text-brand hover:underline"
                  >
                    +{dayRows.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Small legend so the colour coding is not a guessing game. */
export function StatusLegend(): JSX.Element {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {Object.entries(APPOINTMENT_STATUS_META).map(([status, meta]) => (
        <li key={status} className="flex items-center gap-1.5 text-[11px] text-muted">
          <span
            className={cn('h-2.5 w-2.5 rounded-sm border-l-2', STATUS_TINT[status])}
            aria-hidden
          />
          {meta.label}
        </li>
      ))}
    </ul>
  );
}
