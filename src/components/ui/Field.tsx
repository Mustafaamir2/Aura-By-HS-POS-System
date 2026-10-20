import { useId, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** Receives the ids to wire up label, hint and error for screen readers. */
  children: (ids: { inputId: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/**
 * Shared label / hint / error scaffolding. Every input in the app is wrapped in
 * one of these so the accessibility wiring is done once, not per form.
 */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps): JSX.Element {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink">
          {label}
          {required && (
            <span className="text-danger ml-0.5" aria-hidden>
              *
            </span>
          )}
          {required && <span className="sr-only"> (required)</span>}
        </label>
      )}

      {children({ inputId, describedBy, invalid: Boolean(error) })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Shared input chrome, so every control looks and focuses identically. */
export const controlClasses = (invalid?: boolean, className?: string): string =>
  cn(
    'w-full rounded-xl border bg-surface px-3 text-sm text-ink',
    'placeholder:text-subtle',
    'transition-colors duration-150',
    'disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted',
    invalid ? 'border-danger' : 'border-line hover:border-subtle',
    className,
  );
