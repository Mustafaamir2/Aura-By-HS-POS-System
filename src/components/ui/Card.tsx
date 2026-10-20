import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** Removes the default padding, for tables and lists that bleed to the edge. */
  flush?: boolean;
}

export function Card({ children, className, flush }: CardProps): JSX.Element {
  return <div className={cn('card', !flush && 'p-5', className)}>{children}</div>;
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Renders a divider under the header. */
  divided?: boolean;
}

export function CardHeader({
  title,
  description,
  action,
  className,
  divided,
}: CardHeaderProps): JSX.Element {
  return (
    <div
      className={cn(
        // Wrapping matters: the action slot is `shrink-0`, so on a phone a wide
        // action (a four-item tab group, say) would otherwise force the whole
        // card wider than the viewport instead of dropping to its own line.
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-3',
        divided && 'border-b border-line pb-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return <div className={cn('p-5', className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('flex items-center justify-end gap-2 border-t border-line p-4', className)}>
      {children}
    </div>
  );
}
