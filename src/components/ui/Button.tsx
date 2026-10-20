import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-brand-ink hover:bg-brand-strong active:bg-brand-strong shadow-sm disabled:hover:bg-brand',
  secondary:
    'bg-brand-soft text-brand hover:bg-brand/15 active:bg-brand/20 disabled:hover:bg-brand-soft',
  outline:
    'border border-line bg-surface text-ink hover:bg-canvas active:bg-line/40 disabled:hover:bg-surface',
  ghost: 'text-muted hover:bg-line/50 hover:text-ink active:bg-line/70',
  danger: 'bg-danger text-danger-ink hover:brightness-95 active:brightness-90 shadow-sm',
  accent: 'bg-accent text-accent-ink hover:brightness-95 active:brightness-90 shadow-sm',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      // Announce the busy state rather than only showing a spinner.
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap',
        'transition-colors duration-150 select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
      ) : (
        leftIcon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{leftIcon}</span>
      )}
      {size !== 'icon' && children}
      {!loading && rightIcon && (
        <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{rightIcon}</span>
      )}
    </button>
  );
});
