import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { useEscapeKey, useFocusTrap, useScrollLock } from './Overlay';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Slides from the right on desktop; always a bottom sheet on phones. */
  side?: 'right' | 'left';
  width?: string;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  width = 'sm:max-w-md',
  className,
}: DrawerProps): JSX.Element | null {
  useScrollLock(open);
  useEscapeKey(open, onClose);
  const ref = useFocusTrap<HTMLDivElement>(open);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={onClose} aria-hidden />

      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        className={cn(
          'absolute flex flex-col bg-surface shadow-pop',
          // Bottom sheet under sm, edge panel from sm up.
          'inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl animate-slide-up',
          'sm:inset-y-0 sm:max-h-none sm:w-full sm:rounded-none sm:animate-slide-in-right',
          side === 'right' ? 'sm:right-0 sm:left-auto' : 'sm:left-0 sm:right-auto',
          width,
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id="drawer-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && <div className="mt-0.5 text-sm text-muted">{description}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-line/60 hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
