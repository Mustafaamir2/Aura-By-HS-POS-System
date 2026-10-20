import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Payment, PaymentMethod, SaleItem, SaleItemKind } from '@/types';
import { uid } from '@/utils/id';
import { round2 } from '@/utils/money';
import { storageKey } from '@/utils/storage';
import { lineTotal, type BillDiscountInput } from '@/services/pricing';

/**
 * The open till. Persisted so a mis-click, a refresh or a dropped connection
 * never loses a half-rung bill — the most annoying thing that can happen at a
 * busy front desk.
 */

export interface CartCustomer {
  id: string | null;
  name: string;
  /** Membership discount that applies to this customer, resolved on selection. */
  membershipDiscountPct: number;
  membershipLabel: string | null;
}

interface CartState {
  items: SaleItem[];
  customer: CartCustomer;
  staffId: string | null;
  appointmentId: string | null;
  billDiscount: BillDiscountInput;
  payments: Payment[];
  notes: string;
  /** The shop this cart belongs to; switching shops clears it. */
  shopId: string | null;

  addItem: (input: {
    kind: SaleItemKind;
    refId: string;
    name: string;
    unitPrice: number;
    staffId?: string | null;
  }) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  setItemDiscount: (itemId: string, discount: number) => void;
  setItemStaff: (itemId: string, staffId: string | null) => void;
  removeItem: (itemId: string) => void;

  setCustomer: (customer: CartCustomer) => void;
  setStaff: (staffId: string | null) => void;
  setAppointment: (appointmentId: string | null) => void;
  setBillDiscount: (discount: BillDiscountInput) => void;
  setNotes: (notes: string) => void;

  setPayments: (payments: Payment[]) => void;
  addPayment: (method: PaymentMethod, amount: number, tendered?: number | null) => void;
  removePayment: (id: string) => void;

  ensureShop: (shopId: string) => void;
  clear: () => void;
  itemCount: () => number;
}

const emptyCustomer: CartCustomer = {
  id: null,
  name: '',
  membershipDiscountPct: 0,
  membershipLabel: null,
};

const initial = {
  items: [] as SaleItem[],
  customer: emptyCustomer,
  staffId: null as string | null,
  appointmentId: null as string | null,
  billDiscount: { mode: 'percent', value: 0 } as BillDiscountInput,
  payments: [] as Payment[],
  notes: '',
  shopId: null as string | null,
};

const recalc = (item: SaleItem): SaleItem => ({ ...item, lineTotal: lineTotal(item) });

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      ...initial,

      addItem: ({ kind, refId, name, unitPrice, staffId }) => {
        const existing = get().items.find((i) => i.kind === kind && i.refId === refId);

        // Tapping the same tile again bumps the quantity rather than duplicating.
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === existing.id ? recalc({ ...i, quantity: i.quantity + 1 }) : i,
            ),
          });
          return;
        }

        const item: SaleItem = recalc({
          id: uid('sit'),
          kind,
          refId,
          name,
          unitPrice,
          quantity: 1,
          discount: 0,
          staffId: staffId ?? get().staffId,
          lineTotal: 0,
        });
        set({ items: [...get().items, item] });
      },

      setQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set({
          items: get().items.map((i) => (i.id === itemId ? recalc({ ...i, quantity }) : i)),
        });
      },

      setItemDiscount: (itemId, discount) =>
        set({
          items: get().items.map((i) =>
            i.id === itemId
              ? recalc({ ...i, discount: Math.min(round2(Math.max(0, discount)), i.unitPrice * i.quantity) })
              : i,
          ),
        }),

      setItemStaff: (itemId, staffId) =>
        set({ items: get().items.map((i) => (i.id === itemId ? { ...i, staffId } : i)) }),

      removeItem: (itemId) => set({ items: get().items.filter((i) => i.id !== itemId) }),

      setCustomer: (customer) => set({ customer }),
      setStaff: (staffId) => set({ staffId }),
      setAppointment: (appointmentId) => set({ appointmentId }),
      setBillDiscount: (billDiscount) => set({ billDiscount }),
      setNotes: (notes) => set({ notes }),

      setPayments: (payments) => set({ payments }),

      addPayment: (method, amount, tendered = null) =>
        set({
          payments: [
            ...get().payments,
            { id: uid('pay'), method, amount: round2(amount), tendered, reference: null },
          ],
        }),

      removePayment: (id) => set({ payments: get().payments.filter((p) => p.id !== id) }),

      ensureShop: (shopId) => {
        // A cart belongs to one branch; switching branches must not carry stock across.
        if (get().shopId !== null && get().shopId !== shopId) {
          set({ ...initial, shopId });
          return;
        }
        if (get().shopId === null) set({ shopId });
      },

      clear: () => set({ ...initial, shopId: get().shopId }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: storageKey('cart'),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
