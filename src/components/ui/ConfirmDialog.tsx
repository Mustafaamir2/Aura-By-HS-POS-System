import { useEffect, useState } from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Modal } from './Modal';
import type { ConfirmOptions } from '@/hooks/useConfirm';

export type ConfirmTone = 'danger' | 'warning' | 'info';

const TONE_ICON: Record<ConfirmTone, JSX.Element> = {
  danger: <Trash2 className="h-5 w-5" aria-hidden />,
  warning: <AlertTriangle className="h-5 w-5" aria-hidden />,
  info: <Info className="h-5 w-5" aria-hidden />,
};

const TONE_STYLES: Record<ConfirmTone, string> = {
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warn-soft text-warn',
  info: 'bg-info-soft text-info',
};

export interface ConfirmDialogProps {
  open: boolean;
  options: ConfirmOptions | null;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
}

export function ConfirmDialog({
  open,
  options,
  onCancel,
  onConfirm,
}: ConfirmDialogProps): JSX.Element | null {
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');

  // Reset the fields each time the dialog is opened for a new action.
  useEffect(() => {
    if (open) {
      setReason('');
      setTyped('');
    }
  }, [open]);

  if (!options) return null;

  const tone = options.tone ?? 'danger';
  const reasonRequired = Boolean(options.requireReason);
  const typeRequired = Boolean(options.typeToConfirm);

  const canConfirm =
    (!reasonRequired || reason.trim().length > 0) &&
    (!typeRequired || typed.trim() === options.typeToConfirm);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={options.title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            {options.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            disabled={!canConfirm}
            onClick={() => onConfirm(reason.trim() || undefined)}
          >
            {options.confirmLabel ?? 'Confirm'}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONE_STYLES[tone]}`}
          aria-hidden
        >
          {TONE_ICON[tone]}
        </span>

        <div className="min-w-0 flex-1 space-y-4">
          {options.description && (
            <p className="text-sm leading-relaxed text-muted">{options.description}</p>
          )}

          {options.requireReason && (
            <Textarea
              label={options.requireReason.label}
              placeholder={options.requireReason.placeholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
            />
          )}

          {options.typeToConfirm && (
            <Input
              label={`Type "${options.typeToConfirm}" to confirm`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
