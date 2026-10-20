import type { Product, ProductCategory, User } from '@/types';
import { uid } from '@/utils/id';
import { commit, delay, nowISO, read, requireRow, scopeTo, ServiceError, stamped } from './db';
import { applyMovementSync, notifyStockThresholds } from './inventoryService';

export interface ProductInput {
  shopId: string;
  name: string;
  brand: string;
  category: ProductCategory;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  supplier: string;
  backBarOnly: boolean;
  imageUrl: string | null;
}

export async function list(shopId: string | null): Promise<Product[]> {
  return delay(scopeTo(read().products, shopId));
}

export function listSync(shopId: string | null): Product[] {
  return scopeTo(read().products, shopId);
}

export async function getById(id: string): Promise<Product> {
  return delay(requireRow(read().products.find((p) => p.id === id), 'That product'));
}

function validate(input: Pick<ProductInput, 'costPrice' | 'sellingPrice' | 'sku' | 'shopId'>, exceptId?: string): void {
  if (input.sellingPrice < input.costPrice) {
    throw new ServiceError(
      'The selling price is below the cost price — this product would be sold at a loss.',
      'validation',
    );
  }
  const clash = read().products.find(
    (p) => p.id !== exceptId && p.shopId === input.shopId && p.sku.toLowerCase() === input.sku.toLowerCase(),
  );
  if (clash) throw new ServiceError(`SKU ${input.sku} is already used by ${clash.name}.`, 'conflict');
}

export async function create(input: ProductInput, actor: User): Promise<Product> {
  validate(input);

  const row: Product = stamped({
    id: uid('prd'),
    shopId: input.shopId,
    name: input.name.trim(),
    brand: input.brand.trim(),
    category: input.category,
    sku: input.sku.trim(),
    imageUrl: input.imageUrl,
    costPrice: input.costPrice,
    sellingPrice: input.sellingPrice,
    // Opening stock is written via a movement below, so start at zero.
    stock: 0,
    minStock: input.minStock,
    unit: input.unit.trim(),
    supplier: input.supplier.trim(),
    backBarOnly: input.backBarOnly,
    active: true,
  });

  const saved = await commit((db) => {
    db.products = [row, ...db.products];
    if (input.stock > 0) {
      applyMovementSync(
        db,
        {
          productId: row.id,
          type: 'purchase',
          quantity: input.stock,
          reason: 'Opening stock recorded when the product was created',
        },
        actor,
      );
    }
    return db.products.find((p) => p.id === row.id) ?? row;
  });

  notifyStockThresholds([saved.id]);
  return saved;
}

/**
 * Stock is deliberately not editable here — it only ever changes through the
 * inventory service, so the movement log stays a complete record.
 */
export async function update(id: string, input: Omit<ProductInput, 'stock'>): Promise<Product> {
  const existing = requireRow(read().products.find((p) => p.id === id), 'That product');
  validate({ ...input, shopId: input.shopId }, id);

  return commit((db) => {
    const next: Product = {
      ...existing,
      ...input,
      name: input.name.trim(),
      brand: input.brand.trim(),
      sku: input.sku.trim(),
      supplier: input.supplier.trim(),
      unit: input.unit.trim(),
      updatedAt: nowISO(),
    };
    db.products = db.products.map((p) => (p.id === id ? next : p));
    return next;
  });
}

export async function setActive(id: string, active: boolean): Promise<Product> {
  const existing = requireRow(read().products.find((p) => p.id === id), 'That product');
  return commit((db) => {
    const next = { ...existing, active, updatedAt: nowISO() };
    db.products = db.products.map((p) => (p.id === id ? next : p));
    return next;
  });
}

/** Products a shop can actually sell over the counter right now. */
export function sellableProducts(shopId: string): Product[] {
  return read().products.filter((p) => p.shopId === shopId && p.active && !p.backBarOnly);
}

export function categoriesInUse(shopId: string | null): ProductCategory[] {
  const set = new Set<ProductCategory>();
  scopeTo(read().products, shopId).forEach((p) => set.add(p.category));
  return [...set].sort();
}
