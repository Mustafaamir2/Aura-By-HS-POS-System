import { useId } from 'react';
import { cn } from '@/utils/cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  /** Used when there is no visible label. */
  srLabel?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
  srLabel,
}: SwitchProps): JSX.Element {
  const id = useId();

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      {(label || description) && (
        <div className="min-w-0">
          {label && (
            <label htmlFor={id} className="cursor-pointer text-sm font-medium text-ink">
              {label}
            </label>
          )}
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
      )}

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label ? undefined : srLabel}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-brand' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
