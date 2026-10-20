import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Link } from 'react-router-dom';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Percentage change against the previous period; null when not comparable. */
  delta?: number | null;
  deltaLabel?: string;
  /** Inverts delta colouring, for figures where up is bad (e.g. no-shows). */
  invertDelta?: boolean;
  hint?: string;
  to?: string;
  tone?: 'default' | 'warn' | 'danger' | 'ok';
  className?: string;
}

const TONE_RING: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: '',
  warn: 'ring-1 ring-warn/25',
  danger: 'ring-1 ring-danger/25',
  ok: 'ring-1 ring-ok/25',
};

const ICON_TONE: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-brand-soft text-brand',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  ok: 'bg-ok-soft text-ok',
};

export function StatCard({
  label,
  value,
  icon,
  delta,
  deltaLabel = 'vs previous period',
  invertDelta = false,
  hint,
  to,
  tone = 'default',
  className,
}: StatCardProps): JSX.Element {
  const isFlat = delta === 0;
  const isUp = typeof delta === 'number' && delta > 0;
  // "Good" depends on the metric: more revenue is good, more no-shows is not.
  const good = invertDelta ? !isUp : isUp;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {icon && (
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-xl [&>svg]:h-[18px] [&>svg]:w-[18px]',
              ICON_TONE[tone],
            )}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>

      {/*
        Never `truncate` or `break-words` here: this is a money figure, and both
        would hide or split digits. The KPI grid goes one-up below 420px so the
        longest realistic total fits on a single line instead.
      */}
      <p className="mt-2 min-w-0 font-display text-[22px] font-semibold leading-none text-ink tabular-nums sm:text-[26px]">
        {value}
      </p>

      {typeof delta === 'number' ? (
        <p className="mt-2.5 flex items-center gap-1 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              isFlat ? 'text-muted' : good ? 'text-ok' : 'text-danger',
            )}
          >
            {isFlat ? (
              <Minus className="h-3 w-3" aria-hidden />
            ) : isUp ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            ) : (
              <ArrowDownRight className="h-3 w-3" aria-hidden />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-subtle">{deltaLabel}</span>
        </p>
      ) : (
        hint && <p className="mt-2.5 text-xs text-subtle">{hint}</p>
      )}
    </>
  );

  const classes = cn(
    // Grid items default to `min-width: auto`, which lets a long value widen
    // the whole track and push the page sideways.
    'card min-w-0 p-4 transition-shadow',
    TONE_RING[tone],
    to && 'hover:shadow-lift cursor-pointer',
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    );
  }

  return <div className={classes}>{body}</div>;
}
