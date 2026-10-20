import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Receipt, ShoppingBag, X } from 'lucide-react';
import type { Sale } from '@/types';
import { useShopScope } from '@/hooks/useShopScope';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useCartStore } from '@/store/cartStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';
import { ItemPicker } from './ItemPicker';
import { CartFab, CartPanel } from './CartPanel';
import { PaymentModal } from './PaymentModal';
import { CustomerFormModal } from '@/features/customers/CustomerFormModal';

/**
 * The till. Item picker on the left, cart permanently visible on the right;
 * on a phone the cart collapses into a bottom sheet so the whole width is
 * available for tapping items.
 */
export function BillingPage(): JSX.Element {
  const { shopId, isAllShops } = useShopScope();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const cart = useCartStore();

  const basePath = pathname.startsWith('/admin') ? '/admin' : '/shop';

  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  // A cart belongs to one branch; switching shops must not carry items across.
  useEffect(() => {
    if (shopId) cart.ensureShop(shopId);
  }, [shopId, cart]);

  const inCart = useMemo(() => {
    const map: Record<string, number> = {};
    cart.items.forEach((item) => {
      map[`${item.kind}:${item.refId}`] = (map[`${item.kind}:${item.refId}`] ?? 0) + item.quantity;
    });
    return map;
  }, [cart.items]);

  const onComplete = (sale: Sale): void => {
    setPaymentOpen(false);
    setCartOpen(false);
    navigate(`${basePath}/billing/bills/${sale.id}`);
  };

  const openCustomerForm = (name: string): void => {
    setNewCustomerName(name);
    setCustomerFormOpen(true);
  };

  if (isAllShops || !shopId) {
    return (
      <>
        <PageHeader title="Sales & billing" />
        <Card>
          <EmptyState
            icon={<ShoppingBag />}
            title="Choose a branch to start a sale"
            description="A bill belongs to one salon. Pick a shop in the top bar and the till will open."
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="New sale"
        description="Add items, then take payment. The cart is saved if you navigate away."
        actions={
          <Button
            variant="outline"
            leftIcon={<Receipt />}
            onClick={() => navigate(`${basePath}/billing/bills`)}
          >
            Bills history
          </Button>
        }
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        {/* ---- Picker ---- */}
        <Card className="min-w-0 min-h-[60vh] lg:h-[calc(100vh-13rem)]">
          <ItemPicker
            shopId={shopId}
            inCart={inCart}
            onPick={(item) => cart.addItem({ ...item, staffId: cart.staffId })}
          />
        </Card>

        {/* ---- Cart: fixed panel from lg up ---- */}
        <Card flush className="hidden lg:flex lg:h-[calc(100vh-13rem)] lg:flex-col">
          <CartPanel
            shopId={shopId}
            onCheckout={() => setPaymentOpen(true)}
            onAddCustomer={openCustomerForm}
          />
        </Card>
      </div>

      {/* ---- Cart: bottom sheet below lg ---- */}
      {isMobile && <CartFab onOpen={() => setCartOpen(true)} />}

      {!isMobile && (
        <div className="lg:hidden">
          <CartFab onOpen={() => setCartOpen(true)} />
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 animate-fade-in"
            onClick={() => setCartOpen(false)}
            aria-hidden
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cart"
            className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-2xl bg-surface shadow-pop animate-slide-up"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-base font-semibold text-ink">Cart</h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-line/60 hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <CartPanel
                shopId={shopId}
                onCheckout={() => {
                  setCartOpen(false);
                  setPaymentOpen(true);
                }}
                onAddCustomer={openCustomerForm}
              />
            </div>
          </div>
        </div>
      )}

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        shopId={shopId}
        onComplete={onComplete}
      />

      <CustomerFormModal
        open={customerFormOpen}
        onClose={() => setCustomerFormOpen(false)}
        shopId={shopId}
        initialName={newCustomerName}
        onSaved={(created) =>
          cart.setCustomer({
            id: created.id,
            name: created.name,
            membershipDiscountPct: 0,
            membershipLabel: null,
          })
        }
      />
    </>
  );
}

export default BillingPage;
