import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Service } from '@/types';
import { formatCurrency } from '@/utils/money';
import { formatDuration } from '@/utils/date';
import { useDb } from '@/hooks/useDb';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import * as catalogService from '@/services/catalogService';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';

const schema = z.object({
  name: z.string().trim().min(2, 'Give the service a name'),
  categoryId: z.string().min(1, 'Choose a category'),
  description: z.string().trim().max(240, 'Keep the description under 240 characters'),
  durationMin: z.coerce
    .number()
    .int('Use whole minutes')
    .min(5, 'A service takes at least 5 minutes')
    .max(480, 'That is longer than a working day'),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  discountPct: z.coerce.number().min(0, 'Cannot be negative').max(90, 'Keep discounts under 90%'),
});

type FormValues = z.infer<typeof schema>;

export interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  service?: Service | null;
}

export function ServiceFormModal({ open, onClose, service }: ServiceFormModalProps): JSX.Element {
  const db = useDb();
  const isEdit = Boolean(service);
  const [qualifiedIds, setQualifiedIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      categoryId: '',
      description: '',
      durationMin: 45,
      price: 0,
      discountPct: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: service?.name ?? '',
      categoryId: service?.categoryId ?? (db.serviceCategories[0]?.id ?? ''),
      description: service?.description ?? '',
      durationMin: service?.durationMin ?? 45,
      price: service?.price ?? 0,
      discountPct: service?.discountPct ?? 0,
    });
    setQualifiedIds(
      service ? db.staff.filter((s) => s.specializations.includes(service.id)).map((s) => s.id) : [],
    );
  }, [open, service, reset, db.serviceCategories, db.staff]);

  const price = Number(watch('price')) || 0;
  const discountPct = Number(watch('discountPct')) || 0;
  const duration = Number(watch('durationMin')) || 0;
  const netPrice = Math.round(price * (1 - discountPct / 100));

  const staffByShop = useMemo(() => {
    return db.shops.map((shop) => ({
      shop,
      members: db.staff.filter((s) => s.shopId === shop.id && s.active && s.role !== 'Receptionist'),
    }));
  }, [db.shops, db.staff]);

  const save = useAsyncAction(
    async (values: FormValues) => {
      const payload = { ...values, imageUrl: service?.imageUrl ?? null };
      const saved = service
        ? await catalogService.updateService(service.id, payload)
        : await catalogService.createService(payload);

      // Qualification lives on the staff records, so it is saved separately.
      await catalogService.setQualifiedStaff(saved.id, qualifiedIds);
      return saved;
    },
    {
      successMessage: (saved) =>
        isEdit ? `${saved.name} was updated.` : `${saved.name} was added to the catalogue.`,
      onSuccess: onClose,
    },
  );

  const toggleStaff = (staffId: string): void => {
    setQualifiedIds((current) =>
      current.includes(staffId) ? current.filter((id) => id !== staffId) : [...current, staffId],
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!save.pending}
      size="lg"
      title={isEdit ? 'Edit service' : 'New service'}
      description={
        isEdit
          ? 'Changes apply to new bookings and bills straight away. Past appointments keep the price they were booked at.'
          : 'Add a treatment to the shared catalogue.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={save.pending}>
            Cancel
          </Button>
          <Button loading={save.pending} onClick={handleSubmit((v) => void save.run(v))}>
            {isEdit ? 'Save changes' : 'Add service'}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit((v) => void save.run(v))} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Service name"
            required
            placeholder="e.g. Hydrating Facial"
            error={errors.name?.message}
            {...register('name')}
          />

          <Select
            label="Category"
            required
            placeholder="Choose a category…"
            options={db.serviceCategories.map((c) => ({ value: c.id, label: c.name }))}
            error={errors.categoryId?.message}
            {...register('categoryId')}
          />
        </div>

        <Textarea
          label="Description"
          placeholder="What the treatment involves"
          rows={2}
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Duration (minutes)"
            required
            type="number"
            min={5}
            step={5}
            hint="Drives the slot length"
            error={errors.durationMin?.message}
            {...register('durationMin')}
          />

          <Input
            label="List price"
            required
            type="number"
            min={0}
            step={50}
            error={errors.price?.message}
            {...register('price')}
          />

          <Input
            label="Discount %"
            type="number"
            min={0}
            max={90}
            step={1}
            error={errors.discountPct?.message}
            {...register('discountPct')}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-brand-soft px-4 py-3 text-[13px]">
          <span className="text-brand">
            Customers pay{' '}
            <span className="font-semibold tabular-nums">{formatCurrency(netPrice)}</span>
          </span>
          {discountPct > 0 && (
            <span className="text-brand/70">
              was <span className="line-through tabular-nums">{formatCurrency(price)}</span>
            </span>
          )}
          <span className="text-brand/70">Takes {formatDuration(duration)}</span>
        </div>

        {/* ---- Qualified staff ---- */}
        <fieldset>
          <legend className="mb-1 text-[13px] font-medium text-ink">Who can perform this</legend>
          <p className="mb-3 text-xs text-muted">
            Only the stylists you tick here will be offered when this service is booked.
          </p>

          <div className="max-h-56 space-y-4 overflow-y-auto rounded-xl border border-line p-3">
            {staffByShop.map(({ shop, members }) => (
              <div key={shop.id}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">
                  {shop.name}
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {members.map((member) => (
                    <Checkbox
                      key={member.id}
                      label={member.name}
                      description={member.role}
                      checked={qualifiedIds.includes(member.id)}
                      onChange={() => toggleStaff(member.id)}
                    />
                  ))}
                  {members.length === 0 && (
                    <p className="text-xs text-subtle">No active staff at this branch.</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {qualifiedIds.length === 0 && (
            <p className="mt-2 text-xs text-warn">
              Nobody is qualified yet — this service cannot be booked until someone is ticked.
            </p>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
