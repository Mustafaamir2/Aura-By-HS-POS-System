import { useCallback, useRef, useState } from 'react';
import { useToast } from './useToast';

export interface AsyncAction<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  pending: boolean;
  error: string | null;
}

export interface AsyncActionOptions<TResult> {
  /** Toast shown when the action resolves. */
  successMessage?: string | ((result: TResult) => string);
  /** Set false to handle errors yourself. */
  toastOnError?: boolean;
  onSuccess?: (result: TResult) => void;
  onError?: (error: unknown) => void;
}

/**
 * Wraps a service call with pending state, error capture and the success and
 * failure toasts, so every mutating button in the app behaves the same way.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: AsyncActionOptions<TResult> = {},
): AsyncAction<TArgs, TResult> {
  const { successMessage, toastOnError = true, onSuccess, onError } = options;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Guards against a state update after the component has gone away.
  const mounted = useRef(true);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setPending(true);
      setError(null);
      try {
        const result = await action(...args);
        if (successMessage) {
          toast.success(
            typeof successMessage === 'function' ? successMessage(result) : successMessage,
          );
        }
        onSuccess?.(result);
        return result;
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Something went wrong. Please try again.';
        if (mounted.current) setError(message);
        if (toastOnError) toast.error(message);
        onError?.(caught);
        return undefined;
      } finally {
        if (mounted.current) setPending(false);
      }
    },
    // `toast` is stable; the others are the real dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, successMessage, toastOnError, onSuccess, onError],
  );

  return { run, pending, error };
}
