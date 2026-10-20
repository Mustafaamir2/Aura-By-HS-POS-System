import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import type { Product, ProductCategory } from '@/types';
import { PRODUCT_CATEGORIES } from '@/types/product';
import { formatCurrency, formatPercent } from '@/utils/money';
import { useDb } from '@/hooks/useDb';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useAuthStore } from '@/store/authStore';
import * as productService from '@/services/productService';
import { productMargin } from '@/services/pricing';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Give the product a name'),
    brand: z.string().trim().min(1, 'Enter the brand'),
    category: z.string().min(1, 'Choose a category'),
    sku: z.string().trim().min(2, 'Enter a SKU'),
    costPrice: z.coerce.number().min(0, 'Cost cannot be negative'),
    sellingPrice: z.coerce.number().min(0, 'Price cannot be negative'),
    stock: z.coerce.number().int('Use whole units').min(0, 'Stock cannot be negative'),
    minStock: z.coerce.number().int('Use whole units').min(0, 'Minimum cannot be negative'),
    unit: z.string().trim().min(1, 'e.g. bottle, tube, box'),
    supplier: z.string().trim().min(1, 'Enter the supplier'),
    backBarOnly: z.boolean(),
  })
  // Selling below cost is almost always a typo, so it is blocked here as well
  // as in the service layer.
  .refine((values) => values.sellingPrice >= values.costPrice, {
    message: 'The selling price must be at least the cost price',
    path: ['sellingPrice'],
  });

type FormValues = z.infer<typeof schema>;

export interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  shopId: string;
  product?: Product | null;
}

export function ProductFormModal({
  open,
  onClose,
  shopId,
  product,
}: ProductFormModalProps): JSX.Element {
  const db = useDb();
  const actor = useAuthStore((s) => s.user);
  const isEdit = Boolean(product);

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
      brand: '',
      category: 'Hair Care',
      sku: '',
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
      minStock: 5,
      unit: 'bottle',
      supplier: '',
      backBarOnly: false,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: product?.name ?? '',
      brand: product?.brand ?? '',
      category: product?.category ?? 'Hair Care',
      sku: product?.sku ?? '',
      costPrice: product?.costPrice ?? 0,
      sellingPrice: product?.sellingPrice ?? 0,
      stock: product?.stock ?? 0,
      minStock: product?.minStock ?? 5,
      unit: product?.unit ?? 'bottle',
      supplier: product?.supplier ?? '',
      backBarOnly: product?.backBarOnly ?? false,
    });
  }, [open, product, reset]);

  const cost = Number(watch('costPrice')) || 0;
  const selling = Number(watch('sellingPrice')) || 0;
  const margin = productMargin(cost, selling);

  const save = useAsyncAction(
    async (values: FormValues) => {
      if (!actor) throw new Error('You must be signed in.');

      const payload = {
        shopId,
        name: values.name,
        brand: values.brand,
        category: values.category as ProductCategory,
        sku: values.sku,
        costPrice: values.costPrice,
        sellingPrice: values.sellingPrice,
        minStock: values.minStock,
        unit: values.unit,
        supplier: values.supplier,
        backBarOnly: values.backBarOnly,
        imageUrl: product?.imageUrl ?? null,
      };

      return product
        ? productService.update(product.id, payload)
        : productService.create({ ...payload, stock: values.stock }, actor);
    },
    {
      successMessage: (saved) =>
        isEdit ? `${saved.name} was updated.` : `${saved.name} was added to stock.`,
      onSuccess: onClose,
    },
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!save.pending}
      size="lg"
      title={isEdit ? 'Edit product' : 'New product'}
      description={
        isEdit
          ? 'Stock levels are changed from the Inventory page, so every movement is logged.'
          : 'Add a product to this branch, with its opening stock.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={save.pending}>
            Cancel
          </Button>
          <Button loading={save.pending} onClick={handleSubmit((v) => void save.run(v))}>
            {isEdit ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((v) => void save.run(v))} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Product name"
            required
            placeholder="Repair Shampoo 300ml"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Brand"
            required
            placeholder="Kérastase"
            error={errors.brand?.message}
            {...register('brand')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Category"
            required
            options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
            error={errors.category?.message}
            {...register('category')}
          />

          <Input
            label="SKU"
            required
            placeholder="LMG-0001"
            hint="Unique within this branch"
            error={errors.sku?.message}
            {...register('sku')}
          />

          <Input
            label="Unit"
            required
            placeholder="bottle"
            error={errors.unit?.message}
            {...register('unit')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Cost price"
            required
            type="number"
            min={0}
            step={50}
            hint="What you pay the supplier"
            error={errors.costPrice?.message}
            {...register('costPrice')}
          />

          <Input
            label="Selling price"
            required
            type="number"
            min={0}
            step={50}
            hint="What the customer pays"
            error={errors.sellingPrice?.message}
            {...register('sellingPrice')}
          />
        </div>

        <div
          className={
            margin.amount >= 0
              ? 'flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-ok-soft px-4 py-3 text-[13px]'
              : 'flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-danger-soft px-4 py-3 text-[13px]'
          }
        >
          {margin.amount < 0 && <AlertTriangle className="h-4 w-4 text-danger" aria-hidden />}
          <span className={margin.amount >= 0 ? 'text-ok' : 'text-danger'}>
            Margin:{' '}
            <span className="font-semibold tabular-nums">{formatCurrency(margin.amount)}</span>{' '}
            per unit ({formatPercent(margin.percent)})
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label={isEdit ? 'Current stock' : 'Opening stock'}
            required={!isEdit}
            type="number"
            min={0}
            disabled={isEdit}
            hint={isEdit ? 'Change this from Inventory' : 'Recorded as a stock movement'}
            error={errors.stock?.message}
            {...register('stock')}
          />

          <Input
            label="Minimum stock"
            required
            type="number"
            min={0}
            hint="Triggers a low-stock alert"
            error={errors.minStock?.message}
            {...register('minStock')}
          />

          <Input
            label="Supplier"
            required
            placeholder="Beauty Depot Pvt Ltd"
            error={errors.supplier?.message}
            {...register('supplier')}
          />
        </div>

        <Checkbox
          label="Back-bar only"
          description="Used during services, never sold over the counter. Hidden from the till."
          {...register('backBarOnly')}
        />

        <p className="rounded-xl bg-canvas px-3.5 py-2.5 text-[13px] text-muted">
          Branch:{' '}
          <span className="font-medium text-ink">
            {db.shops.find((s) => s.id === shopId)?.name ?? '—'}
          </span>
        </p>
      </form>
    </Modal>
  );
}
