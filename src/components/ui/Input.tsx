import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { controlClasses, Field } from './Field';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  /** Text shown inside the field, e.g. a currency symbol. */
  prefix?: string;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightSlot, prefix, required, className, containerClassName, ...rest },
  ref,
) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={containerClassName}
    >
      {({ inputId, describedBy, invalid }) => (
        <div className="relative flex items-center">
          {leftIcon && (
            <span
              className="pointer-events-none absolute left-3 text-subtle [&>svg]:h-4 [&>svg]:w-4"
              aria-hidden
            >
              {leftIcon}
            </span>
          )}
          {prefix && (
            <span className="pointer-events-none absolute left-3 text-sm text-subtle" aria-hidden>
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            required={required}
            className={cn(
              controlClasses(invalid),
              'h-10',
              leftIcon && 'pl-9',
              prefix && 'pl-10',
              rightSlot && 'pr-10',
              className,
            )}
            {...rest}
          />
          {rightSlot && <span className="absolute right-2 flex items-center">{rightSlot}</span>}
        </div>
      )}
    </Field>
  );
});
