import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }): JSX.Element {
  return (
    <nav aria-label="Breadcrumb" className="mb-1.5">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {item.to && !last ? (
                <Link to={item.to} className="transition-colors hover:text-brand hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={cn(last && 'font-medium text-ink')} aria-current={last ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="h-3 w-3 text-subtle" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  /** Rendered under the title row, e.g. a filter bar or tabs. */
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}: PageHeaderProps): JSX.Element {
  return (
    <header className={cn('mb-5', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold leading-tight text-ink">{title}</h1>
          {description && <div className="mt-1 text-sm text-muted">{description}</div>}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
