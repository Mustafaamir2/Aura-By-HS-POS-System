import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { controlClasses, Field } from './Field';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, className, containerClassName, rows = 3, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={containerClassName}>
      {({ inputId, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(controlClasses(invalid), 'py-2.5 resize-y leading-relaxed', className)}
          {...rest}
        />
      )}
    </Field>
  );
});
