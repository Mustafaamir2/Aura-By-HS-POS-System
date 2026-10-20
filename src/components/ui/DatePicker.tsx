import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { controlClasses, Field } from './Field';

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

/**
 * The native date input, dressed to match the rest of the form controls. It
 * gives us the platform's own calendar and keyboard handling for free, which
 * beats anything hand-rolled on mobile.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { label, hint, error, required, className, containerClassName, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={containerClassName}>
      {({ inputId, describedBy, invalid }) => (
        <input
          ref={ref}
          id={inputId}
          type="date"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(controlClasses(invalid), 'h-10 cursor-pointer', className)}
          {...rest}
        />
      )}
    </Field>
  );
});
