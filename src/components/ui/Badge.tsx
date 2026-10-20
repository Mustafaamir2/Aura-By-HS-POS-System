import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import type { ToneName } from '@/utils/appointmentStatus';
import { APPOINTMENT_STATUS_META } from '@/utils/appointmentStatus';
import type { AppointmentStatus, StockStatus } from '@/types';

const TONES: Record<ToneName, string> = {
  neutral: 'bg-line/60 text-muted',
  info: 'bg-info-soft text-info',
  brand: 'bg-brand-soft text-brand',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
};

export interface BadgeProps {
  tone?: ToneName;
  children: ReactNode;
  className?: string;
  /** Shows a small filled dot before the label. */
  dot?: boolean;
}

export function Badge({ tone = 'neutral', children, className, dot }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}): JSX.Element {
  const meta = APPOINTMENT_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
}

const STOCK_META: Record<StockStatus, { label: string; tone: ToneName }> = {
  'in-stock': { label: 'In stock', tone: 'ok' },
  low: { label: 'Low stock', tone: 'warn' },
  out: { label: 'Out of stock', tone: 'danger' },
};

export function StockBadge({
  status,
  className,
}: {
  status: StockStatus;
  className?: string;
}): JSX.Element {
  const meta = STOCK_META[status];
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }): JSX.Element {
  return (
    <Badge tone={active ? 'ok' : 'neutral'} dot>
      {active ? 'Active' : 'Inactive'}
    </Badge>
  );
}
