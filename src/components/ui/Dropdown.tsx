import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface DropdownProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: 'start' | 'end';
  className?: string;
  /** Width of the panel; defaults to a comfortable menu width. */
  panelClassName?: string;
}

export function Dropdown({
  trigger,
  children,
  align = 'end',
  className,
  panelClassName,
}: DropdownProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on an outside click or Escape — the two things people expect.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const close = (): void => setOpen(false);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-40 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-line bg-elevated p-1 shadow-pop animate-slide-up',
            align === 'end' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export interface DropdownItemProps {
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** Explains why the item is unavailable. */
  title?: string;
}

export function DropdownItem({
  onClick,
  icon,
  children,
  tone = 'default',
  disabled,
  title,
}: DropdownItemProps): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'danger'
          ? 'text-danger hover:bg-danger-soft'
          : 'text-ink hover:bg-brand-soft hover:text-brand',
      )}
    >
      {icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4" aria-hidden>{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}

export function DropdownDivider(): JSX.Element {
  return <div className="my-1 h-px bg-line" role="separator" />;
}

export function DropdownLabel({ children }: { children: ReactNode }): JSX.Element {
  return (
    <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">
      {children}
    </p>
  );
}
