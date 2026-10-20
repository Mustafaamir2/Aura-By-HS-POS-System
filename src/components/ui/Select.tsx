import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { controlClasses, Field } from './Field';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, placeholder, required, className, containerClassName, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={containerClassName}>
      {({ inputId, describedBy, invalid }) => (
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            required={required}
            className={cn(controlClasses(invalid), 'h-10 appearance-none pr-9 cursor-pointer', className)}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled={required}>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
            aria-hidden
          />
        </div>
      )}
    </Field>
  );
});
