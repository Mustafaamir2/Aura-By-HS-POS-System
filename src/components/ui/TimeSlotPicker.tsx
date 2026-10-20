import { useMemo } from 'react';
import { CalendarOff, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatClock } from '@/utils/date';
import { SLOT_REASON_LABEL, type TimeSlot } from '@/services/availability';
import { EmptyState } from './States';
import { Skeleton } from './States';

export interface TimeSlotPickerProps {
  slots: TimeSlot[];
  value: string | null;
  onChange: (time: string) => void;
  loading?: boolean;
  /** Shown when the stylist is off or the salon is closed. */
  dayMessage?: string | null;
  /** Hide slots that can never be taken, rather than greying them out. */
  hideUnavailable?: boolean;
  className?: string;
}

/**
 * Renders the grid of bookable times. Unavailable slots stay visible but
 * disabled, each carrying the reason — a blank morning is far more confusing
 * than a morning of greyed-out slots that say "already booked".
 */
export function TimeSlotPicker({
  slots,
  value,
  onChange,
  loading,
  dayMessage,
  hideUnavailable = false,
  className,
}: TimeSlotPickerProps): JSX.Element {
  const visible = useMemo(
    () => (hideUnavailable ? slots.filter((s) => s.available) : slots),
    [slots, hideUnavailable],
  );

  const availableCount = slots.filter((s) => s.available).length;

  if (loading) {
    return (
      <div className={cn('grid grid-cols-3 gap-2 sm:grid-cols-4', className)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-xl" />
        ))}
      </div>
    );
  }

  if (dayMessage) {
    return (
      <div className={cn('rounded-xl border border-dashed border-line', className)}>
        <EmptyState compact icon={<CalendarOff />} title={dayMessage} />
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed border-line', className)}>
        <EmptyState
          compact
          icon={<Clock />}
          title="No times available"
          description="Try another stylist, or a different day."
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="mb-2 text-xs text-muted">
        <span className="font-medium text-ink tabular-nums">{availableCount}</span>{' '}
        {availableCount === 1 ? 'slot' : 'slots'} available
      </p>

      <div
        role="radiogroup"
        aria-label="Available appointment times"
        className="grid grid-cols-3 gap-2 sm:grid-cols-4"
      >
        {visible.map((slot) => {
          const selected = value === slot.time;
          const reason = slot.reason ? SLOT_REASON_LABEL[slot.reason] : undefined;

          return (
            <button
              key={slot.time}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!slot.available}
              title={reason}
              onClick={() => onChange(slot.time)}
              className={cn(
                'h-10 rounded-xl border text-[13px] font-medium tabular-nums transition-colors',
                'disabled:cursor-not-allowed',
                selected
                  ? 'border-brand bg-brand text-brand-ink shadow-sm'
                  : slot.available
                    ? 'border-line bg-surface text-ink hover:border-brand hover:bg-brand-soft'
                    : 'border-transparent bg-line/40 text-subtle line-through',
              )}
            >
              {formatClock(slot.time)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
