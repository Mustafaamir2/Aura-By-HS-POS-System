import type { BaseRecord, ShopScoped } from './common';

export type ProductCategory =
  | 'Hair Care'
  | 'Skin Care'
  | 'Nail Care'
  | 'Styling Tools'
  | 'Colour & Chemicals'
  | 'Consumables';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Hair Care',
  'Skin Care',
  'Nail Care',
  'Styling Tools',
  'Colour & Chemicals',
  'Consumables',
];

export interface Product extends BaseRecord, ShopScoped {
  name: string;
  brand: string;
  category: ProductCategory;
  sku: string;
  imageUrl: string | null;
  /** What the salon pays the supplier. Never charged to a customer. */
  costPrice: number;
  /** What the customer pays. */
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  supplier: string;
  /** Back-bar stock is consumed during services, not sold over the counter. */
  backBarOnly: boolean;
  active: boolean;
}

export type StockStatus = 'in-stock' | 'low' | 'out';

export type MovementType =
  | 'purchase'
  | 'sale'
  | 'adjustment'
  | 'service-use'
  | 'transfer'
  | 'refund';

export interface InventoryMovement extends BaseRecord, ShopScoped {
  productId: string;
  type: MovementType;
  /** Signed: positive adds stock, negative removes it. */
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  /** The sale or transfer that caused this movement, when there is one. */
  referenceId: string | null;
  userId: string;
  userName: string;
}
