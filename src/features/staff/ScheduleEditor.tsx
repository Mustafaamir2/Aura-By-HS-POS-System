import type { StaffShift, Weekday } from '@/types';
import { cn } from '@/utils/cn';
import { clockToMinutes, WEEKDAY_LABELS, WEEKDAYS } from '@/utils/date';
import { Switch } from '@/components/ui/Switch';

export interface ScheduleEditorProps {
  schedule: StaffShift[];
  onChange: (schedule: StaffShift[]) => void;
  className?: string;
}

/** Sensible default for a newly created team member. */
export function defaultSchedule(): StaffShift[] {
  return WEEKDAYS.map((weekday) => ({
    weekday,
    // Salons are shut on Mondays, so that day starts off.
    working: weekday !== 1,
    start: '10:00',
    end: '20:00',
    breakStart: '14:00',
    breakEnd: '14:45',
  }));
}

/**
 * Weekly rota editor. What is entered here feeds straight into the availability
 * engine, so the warnings below matter — an end time before a start time would
 * silently produce a day with no slots.
 */
export function ScheduleEditor({ schedule, onChange, className }: ScheduleEditorProps): JSX.Element {
  const update = (weekday: Weekday, patch: Partial<StaffShift>): void => {
    onChange(schedule.map((shift) => (shift.weekday === weekday ? { ...shift, ...patch } : shift)));
  };

  return (
    <div className={cn('space-y-2', className)}>
      {WEEKDAYS.map((weekday) => {
        const shift = schedule.find((s) => s.weekday === weekday);
        if (!shift) return null;

        const invalidShift = shift.working && clockToMinutes(shift.end) <= clockToMinutes(shift.start);
        const hasBreak = Boolean(shift.breakStart && shift.breakEnd);
        const invalidBreak =
          hasBreak &&
          shift.breakStart &&
          shift.breakEnd &&
          (clockToMinutes(shift.breakEnd) <= clockToMinutes(shift.breakStart) ||
            clockToMinutes(shift.breakStart) < clockToMinutes(shift.start) ||
            clockToMinutes(shift.breakEnd) > clockToMinutes(shift.end));

        return (
          <div
            key={weekday}
            className={cn(
              'rounded-xl border p-3 transition-colors',
              shift.working ? 'border-line bg-surface' : 'border-line/60 bg-canvas',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={cn(
                  'w-24 shrink-0 text-[13px] font-medium',
                  shift.working ? 'text-ink' : 'text-subtle',
                )}
              >
                {WEEKDAY_LABELS[weekday]}
              </span>

              <Switch
                checked={shift.working}
                onChange={(working) => update(weekday, { working })}
                srLabel={`${WEEKDAY_LABELS[weekday]} working`}
                className="ml-auto"
              />
            </div>

            {shift.working && (
              <div className="mt-3 space-y-2 border-t border-line pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="w-10">From</span>
                    <input
                      type="time"
                      value={shift.start}
                      onChange={(e) => update(weekday, { start: e.target.value })}
                      aria-label={`${WEEKDAY_LABELS[weekday]} start time`}
                      className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink"
                    />
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="w-6">to</span>
                    <input
                      type="time"
                      value={shift.end}
                      onChange={(e) => update(weekday, { end: e.target.value })}
                      aria-label={`${WEEKDAY_LABELS[weekday]} end time`}
                      className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={hasBreak}
                      onChange={(e) =>
                        update(weekday, {
                          breakStart: e.target.checked ? '14:00' : null,
                          breakEnd: e.target.checked ? '14:45' : null,
                        })
                      }
                      className="h-3.5 w-3.5 rounded border-line accent-[rgb(var(--c-brand))]"
                    />
                    Break
                  </label>

                  {hasBreak && (
                    <>
                      <input
                        type="time"
                        value={shift.breakStart ?? ''}
                        onChange={(e) => update(weekday, { breakStart: e.target.value })}
                        aria-label={`${WEEKDAY_LABELS[weekday]} break start`}
                        className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink"
                      />
                      <span className="text-xs text-subtle">to</span>
                      <input
                        type="time"
                        value={shift.breakEnd ?? ''}
                        onChange={(e) => update(weekday, { breakEnd: e.target.value })}
                        aria-label={`${WEEKDAY_LABELS[weekday]} break end`}
                        className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink"
                      />
                    </>
                  )}
                </div>

                {invalidShift && (
                  <p className="text-xs text-danger">
                    The finish time must be after the start time, or no slots will be offered.
                  </p>
                )}
                {invalidBreak && (
                  <p className="text-xs text-danger">
                    The break must sit inside the shift and end after it starts.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** True when every working day is internally consistent. */
export function isScheduleValid(schedule: StaffShift[]): boolean {
  return schedule.every((shift) => {
    if (!shift.working) return true;
    if (clockToMinutes(shift.end) <= clockToMinutes(shift.start)) return false;
    if (shift.breakStart && shift.breakEnd) {
      const bs = clockToMinutes(shift.breakStart);
      const be = clockToMinutes(shift.breakEnd);
      if (be <= bs) return false;
      if (bs < clockToMinutes(shift.start) || be > clockToMinutes(shift.end)) return false;
    }
    return true;
  });
}
