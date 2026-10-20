import { useEffect, useRef } from 'react';

/** Locks body scroll while an overlay is open, restoring the previous value. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

/** Calls `onClose` on Escape, for any dismissible overlay. */
export function useEscapeKey(active: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [active, onClose]);
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps Tab inside the overlay and returns focus where it came from on close,
 * so keyboard users are never dropped behind a modal.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const node = ref.current;
    if (!node) return;

    // Focus the first control, or the container itself when there is none.
    const focusables = node.querySelectorAll<HTMLElement>(FOCUSABLE);
    (focusables[0] ?? node).focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;

      const first = items[0]!;
      const last = items[items.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener('keydown', onKeyDown);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus({ preventScroll: true });
    };
  }, [active]);

  return ref;
}
