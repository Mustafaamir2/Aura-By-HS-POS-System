import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ConfirmDialog, type ConfirmTone } from '@/components/ui/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** When set, the user must type this text before confirming. */
  typeToConfirm?: string;
  /** When set, a reason is required and passed to the resolver. */
  requireReason?: { label: string; placeholder?: string };
}

export interface ConfirmResult {
  confirmed: boolean;
  reason?: string;
}

type Resolver = (result: ConfirmResult) => void;

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<ConfirmResult>) | null>(
  null,
);

/**
 * Every destructive action in the app routes through here, so cancelling a
 * booking, refunding a bill or deactivating a branch all ask in the same way.
 */
export function ConfirmProvider({ children }: { children: ReactNode }): JSX.Element {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<{ resolve: Resolver } | null>(null);

  const confirm = useCallback((next: ConfirmOptions): Promise<ConfirmResult> => {
    setOptions(next);
    return new Promise<ConfirmResult>((resolve) => {
      setResolver({ resolve });
    });
  }, []);

  const finish = useCallback(
    (result: ConfirmResult): void => {
      resolver?.resolve(result);
      setResolver(null);
      setOptions(null);
    },
    [resolver],
  );

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={options !== null}
        options={options}
        onCancel={() => finish({ confirmed: false })}
        onConfirm={(reason) => finish({ confirmed: true, reason })}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<ConfirmResult> {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside a ConfirmProvider');
  return context;
}
