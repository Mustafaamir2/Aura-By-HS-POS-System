import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, isSameDay, parseISO, subDays } from 'date-fns';
import { CalendarOff, ChevronLeft, ChevronRight, Clock, Coffee } from 'lucide-react';
import type { Weekday } from '@/types';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/money';
import { format, formatClock, formatDuration, formatTime, toISODate } from '@/utils/date';
import { useDb } from '@/hooks/useDb';
import { useShopScope } from '@/hooks/useShopScope';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';

/**
 * Read-only rota for shop accounts. They need to see who is in and what each
 * stylist has booked, but staff records themselves are the owner's to change.
 */
export function StaffSchedulePage(): JSX.Element {
  const db = useDb();
  const { shopId, shop } = useShopScope();
  const [day, setDay] = useState(new Date());

  const weekday = day.getDay() as Weekday;
  const isoDay = toISODate(day);

  const rows = useMemo(() => {
    const members = db.staff.filter((s) => s.shopId === shopId && s.active);

    return members
      .map((member) => {
        const shift = member.schedule.find((s) => s.weekday === weekday);
        const onLeave = member.timeOff.includes(isoDay);

        const appointments = db.appointments
          .filter((a) => a.staffId === member.id && isSameDay(parseISO(a.startAt), day))
          .sort((a, b) => a.startAt.localeCompare(b.startAt));

        const bookedMinutes = appointments
          .filter((a) => a.status !== 'cancelled' && a.status !== 'no-show')
          .reduce((sum, a) => sum + a.durationMin, 0);

        return {
          member,
          shift,
          onLeave,
          working: Boolean(shift?.working) && !onLeave,
          appointments,
          bookedMinutes,
          revenue: appointments
            .filter((a) => a.status === 'completed')
            .reduce((sum, a) => sum + a.services.reduce((t, s) => t + s.price, 0), 0),
        };
      })
      .sort((a, b) => {
        // People who are in today come first.
        if (a.working !== b.working) return a.working ? -1 : 1;
        return a.member.name.localeCompare(b.member.name);
      });
  }, [db.staff, db.appointments, shopId, weekday, isoDay, day]);

  const onDuty = rows.filter((r) => r.working);

  return (
    <>
      <PageHeader
        title="Staff schedule"
        description={`Who is in at ${shop?.name ?? 'your branch'}, and what they have booked.`}
        actions={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" aria-label="Previous day" onClick={() => setDay((d) => subDays(d, 1))}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDay(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" aria-label="Next day" onClick={() => setDay((d) => addDays(d, 1))}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="font-display text-lg font-semibold text-ink">{format(day, 'EEEE, d MMMM yyyy')}</p>
        <Badge tone={onDuty.length > 0 ? 'ok' : 'neutral'}>
          {onDuty.length} on duty
        </Badge>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No team members at this branch"
            description="Ask the owner to add staff to your shop."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map(({ member, shift, onLeave, working, appointments, bookedMinutes, revenue }) => (
            <Card key={member.id} className={cn(!working && 'opacity-70')}>
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name={member.name} src={member.photoUrl} size="md" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{member.name}</p>
                  <p className="truncate text-xs text-muted">{member.role}</p>
                </div>

                {onLeave ? (
                  <Badge tone="warn" dot>
                    On leave
                  </Badge>
                ) : working && shift ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[13px] tabular-nums text-ink">
                      <Clock className="h-3.5 w-3.5 text-subtle" aria-hidden />
                      {formatClock(shift.start)} – {formatClock(shift.end)}
                    </span>

                    {shift.breakStart && shift.breakEnd && (
                      <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-subtle">
                        <Coffee className="h-3.5 w-3.5" aria-hidden />
                        {formatClock(shift.breakStart)}–{formatClock(shift.breakEnd)}
                      </span>
                    )}
                  </div>
                ) : (
                  <Badge tone="neutral" dot>
                    Day off
                  </Badge>
                )}

                <div className="flex items-center gap-2">
                  <Badge tone={appointments.length > 0 ? 'brand' : 'neutral'}>
                    {appointments.length} booked
                  </Badge>
                  {bookedMinutes > 0 && (
                    <span className="text-xs tabular-nums text-subtle">
                      {formatDuration(bookedMinutes)}
                    </span>
                  )}
                </div>
              </div>

              {appointments.length > 0 && (
                <ul className="mt-3 divide-y divide-line border-t border-line">
                  {appointments.map((appointment) => (
                    <li key={appointment.id}>
                      <Link
                        to={`/shop/appointments?id=${appointment.id}`}
                        className="flex items-center gap-3 py-2.5 transition-colors hover:bg-canvas"
                      >
                        <span className="w-16 shrink-0 text-[13px] font-medium tabular-nums text-ink">
                          {formatTime(appointment.startAt)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-ink">
                            {db.customers.find((c) => c.id === appointment.customerId)?.name ??
                              'Unknown customer'}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {appointment.services
                              .map((s) => db.services.find((x) => x.id === s.serviceId)?.name)
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>

                        <span className="shrink-0 text-xs tabular-nums text-subtle">
                          {formatDuration(appointment.durationMin)}
                        </span>

                        <StatusBadge status={appointment.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {working && appointments.length === 0 && (
                <p className="mt-3 border-t border-line pt-3 text-[13px] text-subtle">
                  Nothing booked — the whole shift is free.
                </p>
              )}

              {revenue > 0 && (
                <p className="mt-2 text-xs text-muted">
                  Completed today:{' '}
                  <span className="font-medium tabular-nums text-ink">{formatCurrency(revenue)}</span>
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <p className="mt-4 flex items-center gap-2 text-xs text-subtle">
        <CalendarOff className="h-3.5 w-3.5" aria-hidden />
        Rotas and leave are managed by the business owner.
      </p>
    </>
  );
}

export default StaffSchedulePage;
