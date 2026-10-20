import type { ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

export interface FilterBarProps {
  children: ReactNode;
  /** Number of filters currently narrowing the result set. */
  activeCount?: number;
  onClear?: () => void;
  className?: string;
  /** Rendered at the far right, e.g. an export button. */
  trailing?: ReactNode;
}

export function FilterBar({
  children,
  activeCount = 0,
  onClear,
  className,
  trailing,
}: FilterBarProps): JSX.Element {
  return (
    <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center', className)}>
      <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        {children}
      </div>

      <div className="flex items-center gap-2">
        {activeCount > 0 && onClear && (
          <Button variant="ghost" size="sm" leftIcon={<X />} onClick={onClear}>
            Clear {activeCount > 1 ? `${activeCount} filters` : 'filter'}
          </Button>
        )}
        {trailing}
      </div>
    </div>
  );
}

/** Compact inline select used inside a filter bar, without a stacked label. */
export interface FilterSelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: FilterSelectProps<T>): JSX.Element {
  return (
    <label className={cn('relative inline-flex items-center', className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 w-full appearance-none rounded-xl border border-line bg-surface pl-3 pr-8 text-sm text-ink transition-colors hover:border-subtle cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <SlidersHorizontal
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-subtle"
        aria-hidden
      />
    </label>
  );
}

/** Toggleable chips, for status filters and category tabs. */
export interface FilterChipsProps<T extends string> {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  label?: string;
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  className,
  label = 'Filter',
}: FilterChipsProps<T>): JSX.Element {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('no-scrollbar -mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 py-0.5', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
            value === option.value
              ? 'border-brand bg-brand text-brand-ink'
              : 'border-line bg-surface text-muted hover:border-subtle hover:text-ink',
          )}
        >
          {option.label}
          {typeof option.count === 'number' && (
            <span
              className={cn(
                'tabular-nums',
                value === option.value ? 'text-brand-ink/70' : 'text-subtle',
              )}
            >
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
