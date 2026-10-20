import { useCallback } from 'react';
import { useUiStore, type ToastTone } from '@/store/uiStore';

export interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  /** Turns a caught error into a readable toast. */
  fromError: (error: unknown, fallback?: string) => void;
}

export function useToast(): ToastApi {
  const push = useUiStore((s) => s.push);

  const make = useCallback(
    (tone: ToastTone) => (title: string, description?: string) => {
      push({ tone, title, description });
    },
    [push],
  );

  const fromError = useCallback(
    (error: unknown, fallback = 'Something went wrong. Please try again.') => {
      const message = error instanceof Error ? error.message : fallback;
      push({ tone: 'error', title: message });
    },
    [push],
  );

  return {
    success: make('success'),
    error: make('error'),
    warning: make('warning'),
    info: make('info'),
    fromError,
  };
}
