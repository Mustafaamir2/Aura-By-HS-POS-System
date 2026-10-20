import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Accessible name when there is no visible label. */
  label?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  label = 'Search',
  autoFocus,
}: SearchBarProps): JSX.Element {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
        aria-hidden
      />
      <input
        type="search"
        role="searchbox"
        aria-label={label}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-9 text-sm text-ink',
          'placeholder:text-subtle transition-colors hover:border-subtle',
          // Safari renders its own clear button on type=search; we provide one.
          '[&::-webkit-search-cancel-button]:hidden',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-subtle transition-colors hover:bg-line/60 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
