import { useMemo, useState } from 'react';
import { Minus, Percent, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import type { SaleItem } from '@/types';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/money';
import { useDb } from '@/hooks/useDb';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { calculateBill } from '@/services/pricing';
import { discountPctFor } from '@/services/customerService';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

export interface CartPanelProps {
  shopId: string;
  onCheckout: () => void;
  onAddCustomer: (name: string) => void;
  className?: string;
}

/** The right-hand half of the till: who is paying, what for, and how much. */
export function CartPanel({
  shopId,
  onCheckout,
  onAddCustomer,
  className,
}: CartPanelProps): JSX.Element {
  const db = useDb();
  const cart = useCartStore();
  const isShopUser = useAuthStore((s) => s.user?.role === 'shop');
  const [discountOpen, setDiscountOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SaleItem | null>(null);

  const maxDiscount = db.settings.billing.maxShopDiscountPct;

  const customers = useMemo(
    () => db.customers.filter((c) => c.shopId === shopId && c.active),
    [db.customers, shopId],
  );

  const staff = useMemo(
    () => db.staff.filter((s) => s.shopId === shopId && s.active),
    [db.staff, shopId],
  );

  const totals = useMemo(
    () =>
      calculateBill({
        items: cart.items,
        billDiscount: cart.billDiscount,
        membershipDiscountPct: cart.customer.membershipDiscountPct,
        taxRatePct: db.settings.billing.taxRatePct,
      }),
    [cart.items, cart.billDiscount, cart.customer.membershipDiscountPct, db.settings.billing.taxRatePct],
  );

  const selectCustomer = (customerId: string | null): void => {
    if (!customerId) {
      cart.setCustomer({ id: null, name: '', membershipDiscountPct: 0, membershipLabel: null });
      return;
    }
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    const held = db.customerMemberships.find(
      (m) => m.customerId === customerId && m.status === 'active',
    );
    const tier = held ? db.memberships.find((t) => t.id === held.membershipId) : undefined;

    cart.setCustomer({
      id: customer.id,
      name: customer.name,
      membershipDiscountPct: discountPctFor(customer.id),
      membershipLabel: tier?.name ?? null,
    });
  };

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      {/* ---------------- Customer + stylist ---------------- */}
      <div className="space-y-3 border-b border-line p-4">
        <SearchableSelect
          label="Customer"
          placeholder="Walk-in customer"
          searchPlaceholder="Name or phone…"
          value={cart.customer.id}
          onChange={selectCustomer}
          clearable
          options={customers.map((c) => ({
            value: c.id,
            label: c.name,
            description: c.phone,
          }))}
          onCreate={onAddCustomer}
          createLabel="Add a new customer"
        />

        {cart.customer.membershipLabel && (
          <div className="flex items-center gap-2 rounded-lg bg-brand-soft px-2.5 py-1.5">
            <Tag className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
            <span className="text-xs text-brand">
              {cart.customer.membershipLabel} member — {cart.customer.membershipDiscountPct}% off
              services
            </span>
          </div>
        )}

        <SearchableSelect
          label="Served by"
          placeholder="Not specified"
          value={cart.staffId}
          onChange={(value) => cart.setStaff(value)}
          clearable
          options={staff.map((s) => ({ value: s.id, label: s.name, description: s.role }))}
        />
      </div>

      {/* ---------------- Lines ---------------- */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {cart.items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag />}
            title="The cart is empty"
            description="Tap a service, package or product to start a bill."
          />
        ) : (
          <ul className="divide-y divide-line">
            {cart.items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-snug text-ink">{item.name}</p>
                    <p className="mt-0.5 text-[11px] text-subtle">
                      {formatCurrency(item.unitPrice)} each
                      {item.kind !== 'service' && ` · ${item.kind}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => cart.removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-line">
                    <button
                      type="button"
                      onClick={() => cart.setQuantity(item.id, item.quantity - 1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                      className="grid h-7 w-7 place-items-center rounded-l-lg text-muted transition-colors hover:bg-line/60 hover:text-ink"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden />
                    </button>

                    <span className="w-8 text-center text-[13px] font-medium tabular-nums text-ink">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => cart.setQuantity(item.id, item.quantity + 1)}
                      aria-label={`Increase quantity of ${item.name}`}
                      className="grid h-7 w-7 place-items-center rounded-r-lg text-muted transition-colors hover:bg-line/60 hover:text-ink"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingItem(item)}
                    className={cn(
                      'inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-colors',
                      item.discount > 0
                        ? 'border-ok/40 bg-ok-soft text-ok'
                        : 'border-line text-muted hover:border-subtle hover:text-ink',
                    )}
                  >
                    <Percent className="h-3 w-3" aria-hidden />
                    {item.discount > 0 ? `−${formatCurrency(item.discount)}` : 'Discount'}
                  </button>

                  <span className="ml-auto text-sm font-semibold tabular-nums text-ink">
                    {formatCurrency(item.lineTotal)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------------- Totals ---------------- */}
      <div className="border-t border-line bg-canvas/60 p-4">
        <dl className="space-y-1.5 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums text-ink">{formatCurrency(totals.subtotal)}</dd>
          </div>

          {totals.itemDiscountTotal > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Item discounts</dt>
              <dd className="tabular-nums text-ok">−{formatCurrency(totals.itemDiscountTotal)}</dd>
            </div>
          )}

          {totals.membershipDiscount > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">
                Membership ({cart.customer.membershipDiscountPct}%)
              </dt>
              <dd className="tabular-nums text-ok">−{formatCurrency(totals.membershipDiscount)}</dd>
            </div>
          )}

          <div className="flex items-center justify-between">
            <dt>
              <button
                type="button"
                onClick={() => setDiscountOpen(true)}
                className="inline-flex items-center gap-1 text-muted underline-offset-2 hover:text-brand hover:underline"
              >
                <Percent className="h-3.5 w-3.5" aria-hidden />
                Bill discount
              </button>
            </dt>
            <dd className={cn('tabular-nums', totals.billDiscount > 0 ? 'text-ok' : 'text-subtle')}>
              {totals.billDiscount > 0 ? `−${formatCurrency(totals.billDiscount)}` : 'None'}
            </dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-muted">Tax ({db.settings.billing.taxRatePct}%)</dt>
            <dd className="tabular-nums text-ink">{formatCurrency(totals.taxAmount)}</dd>
          </div>
        </dl>

        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-sm font-semibold text-ink">Total</span>
          <span className="font-display text-2xl font-semibold tabular-nums text-ink">
            {formatCurrency(totals.total)}
          </span>
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Trash2 />}
            disabled={cart.items.length === 0}
            onClick={() => cart.clear()}
          >
            Clear
          </Button>

          <Button
            fullWidth
            size="lg"
            disabled={cart.items.length === 0}
            onClick={onCheckout}
          >
            Take payment · {formatCurrency(totals.total)}
          </Button>
        </div>
      </div>

      {/* ---------------- Discount modals ---------------- */}
      <BillDiscountModal
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        maxPct={isShopUser ? maxDiscount : 100}
        subtotal={totals.subtotal - totals.membershipDiscount}
      />

      <LineDiscountModal item={editingItem} onClose={() => setEditingItem(null)} />
    </div>
  );
}

function BillDiscountModal({
  open,
  onClose,
  maxPct,
  subtotal,
}: {
  open: boolean;
  onClose: () => void;
  maxPct: number;
  subtotal: number;
}): JSX.Element {
  const cart = useCartStore();
  const [mode, setMode] = useState<'percent' | 'amount'>(cart.billDiscount.mode);
  const [value, setValue] = useState(String(cart.billDiscount.value || ''));

  const numeric = Number(value) || 0;
  const tooHigh = mode === 'percent' && numeric > maxPct;
  const overSubtotal = mode === 'amount' && numeric > subtotal;

  const apply = (): void => {
    cart.setBillDiscount({ mode, value: numeric });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bill discount"
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => {
              cart.setBillDiscount({ mode: 'percent', value: 0 });
              setValue('');
              onClose();
            }}
          >
            Remove discount
          </Button>
          <Button disabled={tooHigh || overSubtotal} onClick={apply}>
            Apply
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['percent', 'amount'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              aria-pressed={mode === option}
              className={cn(
                'flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                mode === option
                  ? 'border-brand bg-brand text-brand-ink'
                  : 'border-line text-muted hover:border-subtle hover:text-ink',
              )}
            >
              {option === 'percent' ? 'Percentage' : 'Fixed amount'}
            </button>
          ))}
        </div>

        <Input
          label={mode === 'percent' ? 'Discount percentage' : 'Discount amount'}
          type="number"
          min={0}
          step={mode === 'percent' ? 1 : 50}
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          rightSlot={<span className="pr-2 text-sm text-subtle">{mode === 'percent' ? '%' : ''}</span>}
          error={
            tooHigh
              ? `Your account can apply at most ${maxPct}%. Ask the owner to approve more.`
              : overSubtotal
                ? 'That is more than the bill total.'
                : undefined
          }
          hint={
            mode === 'percent' && maxPct < 100
              ? `Maximum allowed for your account: ${maxPct}%`
              : undefined
          }
        />
      </div>
    </Modal>
  );
}

function LineDiscountModal({
  item,
  onClose,
}: {
  item: SaleItem | null;
  onClose: () => void;
}): JSX.Element | null {
  const cart = useCartStore();
  const [value, setValue] = useState('');

  if (!item) return null;

  const lineGross = item.unitPrice * item.quantity;
  const numeric = Number(value) || 0;
  const tooHigh = numeric > lineGross;

  return (
    <Modal
      open
      onClose={onClose}
      title="Line discount"
      description={item.name}
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => {
              cart.setItemDiscount(item.id, 0);
              onClose();
            }}
          >
            Remove
          </Button>
          <Button
            disabled={tooHigh}
            onClick={() => {
              cart.setItemDiscount(item.id, numeric);
              onClose();
            }}
          >
            Apply
          </Button>
        </>
      }
    >
      <Input
        label="Discount amount"
        type="number"
        min={0}
        step={50}
        autoFocus
        defaultValue={item.discount || ''}
        onChange={(e) => setValue(e.target.value)}
        hint={`Line total before discount: ${formatCurrency(lineGross)}`}
        error={tooHigh ? 'The discount cannot exceed the line total.' : undefined}
      />
    </Modal>
  );
}

/** Floating cart summary that opens the sheet on phones. */
export function CartFab({ onOpen }: { onOpen: () => void }): JSX.Element | null {
  const items = useCartStore((s) => s.items);
  const billDiscount = useCartStore((s) => s.billDiscount);
  const membershipPct = useCartStore((s) => s.customer.membershipDiscountPct);
  const db = useDb();

  const totals = calculateBill({
    items,
    billDiscount,
    membershipDiscountPct: membershipPct,
    taxRatePct: db.settings.billing.taxRatePct,
  });

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 flex items-center gap-3 rounded-2xl bg-brand px-4 py-3 text-brand-ink shadow-pop md:hidden"
    >
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-ink/15">
        <ShoppingBag className="h-4 w-4" aria-hidden />
      </span>

      <span className="flex-1 text-left">
        <span className="block text-[11px] opacity-80">
          {count} {count === 1 ? 'item' : 'items'}
        </span>
        <span className="block text-sm font-semibold tabular-nums">
          {formatCurrency(totals.total)}
        </span>
      </span>

      <Badge tone="neutral" className="bg-brand-ink/15 text-brand-ink">
        View cart
      </Badge>
    </button>
  );
}
