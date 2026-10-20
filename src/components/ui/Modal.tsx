import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { useEscapeKey, useFocusTrap, useScrollLock } from './Overlay';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[min(1200px,95vw)]',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** Set false while a form is submitting, so a stray click cannot discard it. */
  dismissible?: boolean;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
  className,
}: ModalProps): JSX.Element | null {
  useScrollLock(open);
  useEscapeKey(open && dismissible, onClose);
  const ref = useFocusTrap<HTMLDivElement>(open);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink/40 animate-fade-in backdrop-blur-[2px]"
        onClick={dismissible ? onClose : undefined}
        aria-hidden
      />

      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col bg-surface shadow-pop animate-slide-up',
          // Full-width sheet on phones, centred dialog from small up.
          'rounded-t-2xl sm:rounded-2xl',
          SIZES[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="mt-0.5 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-line/60 hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
