import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Tag } from 'lucide-react';
import type { PackageItem, ServicePackage } from '@/types';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/money';
import { formatDuration } from '@/utils/date';
import { useDb } from '@/hooks/useDb';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { effectivePrice } from '@/services/catalogService';
import * as catalogService from '@/services/catalogService';
import { packageSavings } from '@/services/pricing';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

export interface PackageFormModalProps {
  open: boolean;
  onClose: () => void;
  servicePackage?: ServicePackage | null;
}

export function PackageFormModal({
  open,
  onClose,
  servicePackage,
}: PackageFormModalProps): JSX.Element {
  const db = useDb();
  const isEdit = Boolean(servicePackage);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [items, setItems] = useState<PackageItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(servicePackage?.name ?? '');
    setDescription(servicePackage?.description ?? '');
    setPrice(String(servicePackage?.price ?? ''));
    setItems(servicePackage?.items ?? []);
    setError(null);
  }, [open, servicePackage]);

  const categories = useMemo(
    () =>
      db.serviceCategories
        .filter((c) => c.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => ({
          category,
          services: db.services.filter((s) => s.categoryId === category.id && s.active),
        }))
        .filter((group) => group.services.length > 0),
    [db.serviceCategories, db.services],
  );

  const stats = useMemo(() => {
    let individualTotal = 0;
    let durationMin = 0;

    for (const item of items) {
      const service = db.services.find((s) => s.id === item.serviceId);
      if (!service) continue;
      individualTotal += effectivePrice(service) * item.quantity;
      durationMin += service.durationMin * item.quantity;
    }

    const packagePrice = Number(price) || 0;
    return { individualTotal, durationMin, ...packageSavings(packagePrice, individualTotal) };
  }, [items, price, db.services]);

  const setQuantity = (serviceId: string, quantity: number): void => {
    setItems((current) => {
      if (quantity <= 0) return current.filter((i) => i.serviceId !== serviceId);
      const existing = current.find((i) => i.serviceId === serviceId);
      if (existing) {
        return current.map((i) => (i.serviceId === serviceId ? { ...i, quantity } : i));
      }
      return [...current, { serviceId, quantity }];
    });
  };

  const quantityOf = (serviceId: string): number =>
    items.find((i) => i.serviceId === serviceId)?.quantity ?? 0;

  const save = useAsyncAction(
    async () => {
      const payload = {
        name,
        description,
        items,
        price: Number(price) || 0,
        imageUrl: servicePackage?.imageUrl ?? null,
      };
      return servicePackage
        ? catalogService.updatePackage(servicePackage.id, payload)
        : catalogService.createPackage(payload);
    },
    {
      successMessage: (saved) => (isEdit ? `${saved.name} was updated.` : `${saved.name} was created.`),
      onSuccess: onClose,
    },
  );

  const submit = (): void => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Give the package a name.');
      return;
    }
    if (items.length < 2) {
      setError('A package needs at least two services.');
      return;
    }
    if (!Number(price)) {
      setError('Set a package price.');
      return;
    }
    void save.run();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!save.pending}
      size="lg"
      title={isEdit ? 'Edit package' : 'New package'}
      description="Choose the services to bundle, then set the price customers pay."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={save.pending}>
            Cancel
          </Button>
          <Button loading={save.pending} onClick={submit}>
            {isEdit ? 'Save changes' : 'Create package'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
            {error}
          </p>
        )}

        <Input
          label="Package name"
          required
          placeholder="e.g. Bridal Grand Package"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Textarea
          label="Description"
          placeholder="What the package includes and who it suits"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* ---- Service picker ---- */}
        <div>
          <p className="mb-1 text-[13px] font-medium text-ink">
            Services in this package <span className="text-danger">*</span>
          </p>
          <p className="mb-2 text-xs text-muted">Tap + to add, and again to increase the quantity.</p>

          <div className="max-h-60 space-y-3 overflow-y-auto rounded-xl border border-line p-3">
            {categories.map(({ category, services }) => (
              <div key={category.id}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">
                  {category.name}
                </p>

                <ul className="space-y-1">
                  {services.map((service) => {
                    const quantity = quantityOf(service.id);
                    return (
                      <li
                        key={service.id}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
                          quantity > 0 && 'bg-brand-soft',
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-ink">{service.name}</span>
                          <span className="block text-[11px] tabular-nums text-subtle">
                            {formatCurrency(effectivePrice(service))} ·{' '}
                            {formatDuration(service.durationMin)}
                          </span>
                        </span>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={quantity === 0}
                            onClick={() => setQuantity(service.id, quantity - 1)}
                            aria-label={`Remove one ${service.name}`}
                            className="grid h-6 w-6 place-items-center rounded-md border border-line text-muted transition-colors hover:bg-line/60 disabled:opacity-30"
                          >
                            <Minus className="h-3 w-3" aria-hidden />
                          </button>

                          <span className="w-5 text-center text-[13px] font-medium tabular-nums text-ink">
                            {quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => setQuantity(service.id, quantity + 1)}
                            aria-label={`Add one ${service.name}`}
                            className="grid h-6 w-6 place-items-center rounded-md border border-line text-muted transition-colors hover:bg-line/60"
                          >
                            <Plus className="h-3 w-3" aria-hidden />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Pricing ---- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Package price"
            required
            type="number"
            min={0}
            step={100}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            hint="What the customer pays for the bundle"
          />

          <div className="rounded-xl bg-canvas p-3.5">
            <dl className="space-y-1 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Individually</dt>
                <dd className="tabular-nums text-ink">{formatCurrency(stats.individualTotal)}</dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-muted">Total duration</dt>
                <dd className="tabular-nums text-ink">{formatDuration(stats.durationMin)}</dd>
              </div>

              <div className="flex justify-between border-t border-line pt-1">
                <dt className="font-medium text-ink">Customer saves</dt>
                <dd
                  className={cn(
                    'inline-flex items-center gap-1 font-semibold tabular-nums',
                    stats.amount > 0 ? 'text-ok' : 'text-subtle',
                  )}
                >
                  {stats.amount > 0 && <Tag className="h-3 w-3" aria-hidden />}
                  {formatCurrency(stats.amount)}
                  {stats.amount > 0 && ` (${stats.percent.toFixed(0)}%)`}
                </dd>
              </div>
            </dl>

            {Number(price) > stats.individualTotal && stats.individualTotal > 0 && (
              <p className="mt-2 text-xs text-warn">
                This package costs more than buying the services separately.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
