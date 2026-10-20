import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUiStore, type ToastTone } from '@/store/uiStore';

const ICONS: Record<ToastTone, JSX.Element> = {
  success: <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden />,
  error: <XCircle className="h-[18px] w-[18px]" aria-hidden />,
  warning: <AlertTriangle className="h-[18px] w-[18px]" aria-hidden />,
  info: <Info className="h-[18px] w-[18px]" aria-hidden />,
};

const TONES: Record<ToastTone, string> = {
  success: 'text-ok',
  error: 'text-danger',
  warning: 'text-warn',
  info: 'text-info',
};

export function Toaster(): JSX.Element {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismiss);

  return createPortal(
    <div
      // Assertive would interrupt screen readers mid-sentence; polite is right here.
      aria-live="polite"
      aria-atomic="false"
      className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-auto sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-elevated p-3.5 shadow-pop animate-slide-up"
        >
          <span className={cn('mt-px shrink-0', TONES[toast.tone])}>{ICONS[toast.tone]}</span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug text-ink">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 text-[13px] leading-snug text-muted">{toast.description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="-mr-1 -mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-line/60 hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
