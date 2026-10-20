import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  /** Small count shown after the label, e.g. number of rows. */
  count?: number;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  variant?: 'underline' | 'pill';
  /** Accessible name for the tab list. */
  label?: string;
}

export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  className,
  variant = 'underline',
  label = 'Sections',
}: TabsProps<T>): JSX.Element {
  const onKeyDown = (event: React.KeyboardEvent, index: number): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    // Skip disabled tabs, wrapping around the ends.
    for (let i = 1; i <= items.length; i += 1) {
      const next = items[(index + step * i + items.length * i) % items.length];
      if (next && !next.disabled) {
        onChange(next.value);
        break;
      }
    }
  };

  if (variant === 'pill') {
    return (
      <div
        role="tablist"
        aria-label={label}
        className={cn('no-scrollbar flex min-w-0 gap-1 overflow-x-auto rounded-xl bg-line/50 p-1', className)}
      >
        {items.map((item, index) => (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={value === item.value}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-40',
              value === item.value
                ? 'bg-surface text-ink shadow-sm'
                : 'text-muted hover:text-ink',
            )}
          >
            {item.icon && <span className="[&>svg]:h-4 [&>svg]:w-4" aria-hidden>{item.icon}</span>}
            {item.label}
            {typeof item.count === 'number' && (
              <span className="text-xs text-subtle tabular-nums">{item.count}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('no-scrollbar flex min-w-0 gap-1 overflow-x-auto border-b border-line', className)}
    >
      {items.map((item, index) => (
        <button
          key={item.value}
          role="tab"
          type="button"
          aria-selected={value === item.value}
          disabled={item.disabled}
          onClick={() => onChange(item.value)}
          onKeyDown={(e) => onKeyDown(e, index)}
          className={cn(
            'relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-40',
            value === item.value ? 'text-brand' : 'text-muted hover:text-ink',
          )}
        >
          {item.icon && <span className="[&>svg]:h-4 [&>svg]:w-4" aria-hidden>{item.icon}</span>}
          {item.label}
          {typeof item.count === 'number' && (
            <span className="rounded-full bg-line/70 px-1.5 text-[11px] tabular-nums text-muted">
              {item.count}
            </span>
          )}
          {value === item.value && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" aria-hidden />
          )}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}): JSX.Element | null {
  if (!active) return null;
  return <div role="tabpanel">{children}</div>;
}
