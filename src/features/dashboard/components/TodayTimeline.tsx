import { Link } from 'react-router-dom';
import { CalendarDays, Clock } from 'lucide-react';
import type { Appointment, Customer, Service, Staff } from '@/types';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/money';
import { appointmentEnd, formatDuration, formatTime } from '@/utils/date';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';

export interface TimelineRow {
  appointment: Appointment;
  customer: Customer | undefined;
  staff: Staff | undefined;
  services: Service[];
}

export interface TodayTimelineProps {
  rows: TimelineRow[];
  /** Portal prefix, so links work from either dashboard. */
  basePath: string;
  emptyAction?: React.ReactNode;
  className?: string;
}

export function TodayTimeline({
  rows,
  basePath,
  emptyAction,
  className,
}: TodayTimelineProps): JSX.Element {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays />}
        title="Nothing booked today"
        description="The diary is clear. A good moment to call a few regulars."
        action={emptyAction}
        className={className}
      />
    );
  }

  const now = Date.now();

  return (
    <ul className={cn('divide-y divide-line', className)}>
      {rows.map(({ appointment, customer, staff, services }) => {
        const start = new Date(appointment.startAt);
        const end = appointmentEnd(appointment.startAt, appointment.durationMin);
        const isNow = start.getTime() <= now && end.getTime() >= now;
        const value = appointment.services.reduce((sum, s) => sum + s.price, 0);

        return (
          <li key={appointment.id}>
            <Link
              to={`${basePath}/appointments?id=${appointment.id}`}
              className={cn(
                'flex items-center gap-3 px-1 py-3 transition-colors hover:bg-canvas sm:px-2',
                isNow && 'bg-brand-soft/50',
              )}
            >
              {/* Time column */}
              <div className="w-[68px] shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-ink">{formatTime(start)}</p>
                <p className="text-[11px] tabular-nums text-subtle">
                  {formatDuration(appointment.durationMin)}
                </p>
              </div>

              <span
                className={cn(
                  'h-10 w-0.5 shrink-0 rounded-full',
                  isNow ? 'bg-brand' : 'bg-line',
                )}
                aria-hidden
              />

              {/* Customer + service */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {customer?.name ?? 'Unknown customer'}
                </p>
                <p className="truncate text-xs text-muted">
                  {services.map((s) => s.name).join(', ') || 'No services listed'}
                </p>
              </div>

              {/* Stylist */}
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <Avatar name={staff?.name ?? '?'} src={staff?.photoUrl} size="xs" />
                <span className="max-w-[7rem] truncate text-xs text-muted">
                  {staff?.name ?? 'Unassigned'}
                </span>
              </div>

              <p className="hidden w-20 shrink-0 text-right text-sm font-medium tabular-nums text-ink md:block">
                {formatCurrency(value)}
              </p>

              <div className="shrink-0">
                <StatusBadge status={appointment.status} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Compact "what's next" card for the shop dashboard. */
export function NextUpCard({
  row,
  basePath,
}: {
  row: TimelineRow | null;
  basePath: string;
}): JSX.Element {
  if (!row) {
    return (
      <div className="card flex flex-col justify-center p-5">
        <p className="text-[13px] font-medium text-muted">Next appointment</p>
        <p className="mt-2 text-sm text-subtle">Nothing else booked today.</p>
      </div>
    );
  }

  const { appointment, customer, staff, services } = row;
  const start = new Date(appointment.startAt);
  const minutesAway = Math.round((start.getTime() - Date.now()) / 60000);

  return (
    <Link
      to={`${basePath}/appointments?id=${appointment.id}`}
      className="card flex flex-col p-5 transition-shadow hover:shadow-lift"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-muted">Next appointment</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
          <Clock className="h-3 w-3" aria-hidden />
          {minutesAway <= 0
            ? 'Now'
            : minutesAway < 60
              ? `in ${minutesAway} min`
              : `at ${formatTime(start)}`}
        </span>
      </div>

      <p className="mt-2 font-display text-lg font-semibold text-ink">
        {customer?.name ?? 'Unknown customer'}
      </p>
      <p className="mt-0.5 truncate text-sm text-muted">
        {services.map((s) => s.name).join(', ')}
      </p>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <Avatar name={staff?.name ?? '?'} src={staff?.photoUrl} size="xs" />
        <span className="truncate text-xs text-muted">with {staff?.name ?? 'Unassigned'}</span>
        <span className="ml-auto text-xs tabular-nums text-subtle">
          {formatDuration(appointment.durationMin)}
        </span>
      </div>
    </Link>
  );
}
