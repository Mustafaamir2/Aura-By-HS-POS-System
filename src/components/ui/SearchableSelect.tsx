import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { matches } from '@/utils/text';
import { Field } from './Field';

export interface SearchableOption<T extends string = string> {
  value: T;
  label: string;
  /** Second line, e.g. a phone number under a customer's name. */
  description?: string;
  /** Extra text that should match the query but is not displayed. */
  keywords?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SearchableSelectProps<T extends string = string> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value: T | null;
  onChange: (value: T | null) => void;
  options: SearchableOption<T>[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  /** Renders an "add new" row at the bottom of the list. */
  onCreate?: (query: string) => void;
  createLabel?: string;
  clearable?: boolean;
}

/**
 * A combobox for long lists — customers, stylists, services. Keyboard-driven:
 * type to filter, arrows to move, Enter to choose, Escape to close.
 */
export function SearchableSelect<T extends string = string>({
  label,
  hint,
  error,
  required,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Type to search…',
  emptyMessage = 'No matches found',
  disabled,
  className,
  onCreate,
  createLabel = 'Add new',
  clearable,
}: SearchableSelectProps<T>): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(
    () =>
      options.filter(
        (option) =>
          matches(option.label, query) ||
          matches(option.description, query) ||
          matches(option.keywords, query),
      ),
    [options, query],
  );

  useEffect(() => {
    if (!open) return;
    setHighlighted(0);
    // Focus the search box once the panel has painted.
    const timer = window.setTimeout(() => searchRef.current?.focus(), 10);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const choose = (option: SearchableOption<T>): void => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[highlighted];
      if (option) choose(option);
      else if (onCreate && query.trim()) {
        onCreate(query.trim());
        setOpen(false);
        setQuery('');
      }
    }
  };

  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {({ inputId, describedBy, invalid }) => (
        <div ref={containerRef} className="relative">
          <button
            id={inputId}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              'flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-surface px-3 text-left text-sm transition-colors',
              'disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted',
              invalid ? 'border-danger' : 'border-line hover:border-subtle',
            )}
          >
            <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-subtle')}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-subtle transition-transform', open && 'rotate-180')}
              aria-hidden
            />
          </button>

          {open && (
            <div className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-line bg-elevated shadow-pop animate-slide-up">
              <div className="relative border-b border-line">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-10 w-full bg-transparent pl-9 pr-3 text-sm text-ink placeholder:text-subtle"
                />
              </div>

              <ul role="listbox" className="max-h-60 overflow-y-auto p-1">
                {clearable && value !== null && (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(null);
                        setOpen(false);
                        setQuery('');
                      }}
                      className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-muted transition-colors hover:bg-line/50"
                    >
                      Clear selection
                    </button>
                  </li>
                )}

                {filtered.length === 0 && !onCreate && (
                  <li className="px-3 py-6 text-center text-sm text-subtle">{emptyMessage}</li>
                )}

                {filtered.map((option, index) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={option.value === value}
                      disabled={option.disabled}
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => choose(option)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                        'disabled:cursor-not-allowed disabled:opacity-40',
                        index === highlighted && 'bg-brand-soft',
                      )}
                    >
                      {option.icon && <span className="shrink-0" aria-hidden>{option.icon}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{option.label}</span>
                        {option.description && (
                          <span className="block truncate text-xs text-subtle">
                            {option.description}
                          </span>
                        )}
                      </span>
                      {option.value === value && (
                        <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                      )}
                    </button>
                  </li>
                ))}

                {onCreate && (
                  <li className="mt-1 border-t border-line pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onCreate(query.trim());
                        setOpen(false);
                        setQuery('');
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-brand transition-colors hover:bg-brand-soft"
                    >
                      <Plus className="h-4 w-4 shrink-0" aria-hidden />
                      {query.trim() ? `${createLabel}: "${query.trim()}"` : createLabel}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </Field>
  );
}
