import type { ReactNode } from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  compact,
}: EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8' : 'px-6 py-14',
        className,
      )}
    >
      <span
        className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand [&>svg]:h-5 [&>svg]:w-5"
        aria-hidden
      >
        {icon ?? <Inbox />}
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps): JSX.Element {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
    >
      <span
        className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-danger-soft text-danger"
        aria-hidden
      >
        <AlertCircle className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" leftIcon={<RefreshCw />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }): JSX.Element {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

/** Placeholder rows matching the shape of a loading table. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }): JSX.Element {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn('h-4', colIndex === 0 ? 'w-[22%]' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn('card space-y-3 p-5', className)} aria-busy="true" aria-label="Loading">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
