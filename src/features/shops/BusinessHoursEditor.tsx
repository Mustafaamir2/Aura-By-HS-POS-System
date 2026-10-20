import type { BusinessHours, Weekday } from '@/types';
import { cn } from '@/utils/cn';
import { clockToMinutes, WEEKDAY_LABELS, WEEKDAYS } from '@/utils/date';
import { Switch } from '@/components/ui/Switch';

export function defaultBusinessHours(): BusinessHours {
  return WEEKDAYS.map((weekday) => ({
    weekday,
    // Salons in this group close on Mondays.
    closed: weekday === 1,
    open: '10:00',
    close: '20:00',
  }));
}

export interface BusinessHoursEditorProps {
  hours: BusinessHours;
  onChange: (hours: BusinessHours) => void;
  className?: string;
}

/** Opening hours cap what the booking engine will ever offer. */
export function BusinessHoursEditor({
  hours,
  onChange,
  className,
}: BusinessHoursEditorProps): JSX.Element {
  const update = (weekday: Weekday, patch: Partial<BusinessHours[number]>): void => {
    onChange(hours.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)));
  };

  return (
    <div className={cn('space-y-2', className)}>
      {WEEKDAYS.map((weekday) => {
        const day = hours.find((h) => h.weekday === weekday);
        if (!day) return null;

        const invalid = !day.closed && clockToMinutes(day.close) <= clockToMinutes(day.open);

        return (
          <div
            key={weekday}
            className={cn(
              'flex flex-wrap items-center gap-3 rounded-xl border p-3',
              day.closed ? 'border-line/60 bg-canvas' : 'border-line bg-surface',
            )}
          >
            <span
              className={cn(
                'w-24 shrink-0 text-[13px] font-medium',
                day.closed ? 'text-subtle' : 'text-ink',
              )}
            >
              {WEEKDAY_LABELS[weekday]}
            </span>

            {!day.closed && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={day.open}
                  onChange={(e) => update(weekday, { open: e.target.value })}
                  aria-label={`${WEEKDAY_LABELS[weekday]} opening time`}
                  className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink"
                />
                <span className="text-xs text-subtle">to</span>
                <input
                  type="time"
                  value={day.close}
                  onChange={(e) => update(weekday, { close: e.target.value })}
                  aria-label={`${WEEKDAY_LABELS[weekday]} closing time`}
                  className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink"
                />
              </div>
            )}

            <Switch
              className="ml-auto"
              checked={!day.closed}
              onChange={(open) => update(weekday, { closed: !open })}
              srLabel={`${WEEKDAY_LABELS[weekday]} open`}
            />

            {invalid && (
              <p className="w-full text-xs text-danger">
                Closing time must be after opening time.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function areHoursValid(hours: BusinessHours): boolean {
  return hours.every((day) => day.closed || clockToMinutes(day.close) > clockToMinutes(day.open));
}
