import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, id, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-line bg-surface transition-colors checked:border-brand checked:bg-brand disabled:cursor-not-allowed disabled:opacity-50"
          {...rest}
        />
        <Check
          className="pointer-events-none absolute h-3.5 w-3.5 text-brand-ink opacity-0 peer-checked:opacity-100"
          strokeWidth={3}
          aria-hidden
        />
      </span>
      {(label || description) && (
        <label htmlFor={inputId} className="cursor-pointer select-none leading-tight">
          {label && <span className="text-sm text-ink">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-subtle">{description}</span>}
        </label>
      )}
    </div>
  );
});
