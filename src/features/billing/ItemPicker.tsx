import { useMemo, useState } from 'react';
import { Gift, Package, Scissors } from 'lucide-react';
import type { Product, Service, ServicePackage } from '@/types';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/money';
import { formatDuration } from '@/utils/date';
import { matches } from '@/utils/text';
import { useDb } from '@/hooks/useDb';
import { effectivePrice, packageStats } from '@/services/catalogService';
import { stockStatus } from '@/services/inventoryService';
import { SearchBar } from '@/components/ui/SearchBar';
import { Tabs } from '@/components/ui/Tabs';
import { FilterChips } from '@/components/ui/FilterBar';
import { EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';

export interface PickedItem {
  kind: 'service' | 'package' | 'product';
  refId: string;
  name: string;
  unitPrice: number;
}

export interface ItemPickerProps {
  shopId: string;
  onPick: (item: PickedItem) => void;
  /** Quantities already in the cart, so tiles can show a count. */
  inCart: Record<string, number>;
}

type Kind = 'service' | 'package' | 'product';

/**
 * The left-hand half of the till. Tuned for speed: one tap adds a line, the
 * search box is always in reach, and out-of-stock products cannot be tapped
 * at all rather than failing at checkout.
 */
export function ItemPicker({ shopId, onPick, inCart }: ItemPickerProps): JSX.Element {
  const db = useDb();
  const [kind, setKind] = useState<Kind>('service');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const services = useMemo(() => db.services.filter((s) => s.active), [db.services]);
  const packages = useMemo(() => db.packages.filter((p) => p.active), [db.packages]);
  const products = useMemo(
    () => db.products.filter((p) => p.shopId === shopId && p.active && !p.backBarOnly),
    [db.products, shopId],
  );

  const serviceCategories = useMemo(
    () => db.serviceCategories.filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [db.serviceCategories],
  );

  const productCategories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return [...set].sort();
  }, [products]);

  const visibleServices = useMemo(
    () =>
      services.filter(
        (s) =>
          (category === 'all' || s.categoryId === category) &&
          (matches(s.name, search) || matches(s.description, search)),
      ),
    [services, category, search],
  );

  const visiblePackages = useMemo(
    () => packages.filter((p) => matches(p.name, search) || matches(p.description, search)),
    [packages, search],
  );

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === 'all' || p.category === category) &&
          (matches(p.name, search) || matches(p.brand, search) || matches(p.sku, search)),
      ),
    [products, category, search],
  );

  const chips =
    kind === 'service'
      ? [
          { value: 'all', label: 'All', count: services.length },
          ...serviceCategories.map((c) => ({
            value: c.id,
            label: c.name,
            count: services.filter((s) => s.categoryId === c.id).length,
          })),
        ]
      : kind === 'product'
        ? [
            { value: 'all', label: 'All', count: products.length },
            ...productCategories.map((c) => ({
              value: c,
              label: c,
              count: products.filter((p) => p.category === c).length,
            })),
          ]
        : [];

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="min-w-0 space-y-3 border-b border-line pb-3">
        <Tabs
          variant="pill"
          label="What to add"
          value={kind}
          onChange={(next) => {
            setKind(next as Kind);
            setCategory('all');
          }}
          items={[
            { value: 'service', label: 'Services', icon: <Scissors />, count: services.length },
            { value: 'package', label: 'Packages', icon: <Gift />, count: packages.length },
            { value: 'product', label: 'Products', icon: <Package />, count: products.length },
          ]}
        />

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={`Search ${kind}s…`}
          label={`Search ${kind}s`}
        />

        {chips.length > 0 && (
          <FilterChips
            options={chips}
            value={category}
            onChange={setCategory}
            label="Category"
          />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-3">
        {kind === 'service' && (
          <Grid>
            {visibleServices.map((service) => (
              <ServiceTile
                key={service.id}
                service={service}
                count={inCart[`service:${service.id}`] ?? 0}
                onPick={() =>
                  onPick({
                    kind: 'service',
                    refId: service.id,
                    name: service.name,
                    unitPrice: effectivePrice(service),
                  })
                }
              />
            ))}
            {visibleServices.length === 0 && <Empty label="services" />}
          </Grid>
        )}

        {kind === 'package' && (
          <Grid>
            {visiblePackages.map((pkg) => (
              <PackageTile
                key={pkg.id}
                pkg={pkg}
                count={inCart[`package:${pkg.id}`] ?? 0}
                onPick={() =>
                  onPick({ kind: 'package', refId: pkg.id, name: pkg.name, unitPrice: pkg.price })
                }
              />
            ))}
            {visiblePackages.length === 0 && <Empty label="packages" />}
          </Grid>
        )}

        {kind === 'product' && (
          <Grid>
            {visibleProducts.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                count={inCart[`product:${product.id}`] ?? 0}
                onPick={() =>
                  onPick({
                    kind: 'product',
                    refId: product.id,
                    name: `${product.brand} ${product.name}`,
                    unitPrice: product.sellingPrice,
                  })
                }
              />
            ))}
            {visibleProducts.length === 0 && <Empty label="products" />}
          </Grid>
        )}
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{children}</div>
  );
}

function Empty({ label }: { label: string }): JSX.Element {
  return (
    <div className="col-span-full">
      <EmptyState compact title={`No ${label} match that search`} />
    </div>
  );
}

const TILE_BASE =
  'relative flex flex-col rounded-xl border p-2.5 text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

function CountBadge({ count }: { count: number }): JSX.Element | null {
  if (count === 0) return null;
  return (
    <span
      className="absolute right-1.5 top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-ink tabular-nums"
      aria-label={`${count} in cart`}
    >
      {count}
    </span>
  );
}

function ServiceTile({
  service,
  count,
  onPick,
}: {
  service: Service;
  count: number;
  onPick: () => void;
}): JSX.Element {
  const price = effectivePrice(service);

  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(TILE_BASE, 'border-line bg-surface hover:border-brand hover:bg-brand-soft')}
    >
      <CountBadge count={count} />

      <span className="line-clamp-2 min-h-[2.2rem] pr-5 text-[13px] font-medium leading-snug text-ink">
        {service.name}
      </span>

      <span className="mt-1 text-[11px] text-subtle">{formatDuration(service.durationMin)}</span>

      <span className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-sm font-semibold tabular-nums text-ink">{formatCurrency(price)}</span>
        {service.discountPct > 0 && (
          <span className="text-[11px] tabular-nums text-subtle line-through">
            {formatCurrency(service.price)}
          </span>
        )}
      </span>
    </button>
  );
}

function PackageTile({
  pkg,
  count,
  onPick,
}: {
  pkg: ServicePackage;
  count: number;
  onPick: () => void;
}): JSX.Element {
  const stats = packageStats(pkg);

  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(TILE_BASE, 'border-accent/40 bg-accent-soft/60 hover:border-accent hover:bg-accent-soft')}
    >
      <CountBadge count={count} />

      <span className="line-clamp-2 min-h-[2.2rem] pr-5 text-[13px] font-medium leading-snug text-ink">
        {pkg.name}
      </span>

      <span className="mt-1 text-[11px] text-subtle">
        {pkg.items.length} services · {formatDuration(stats.durationMin)}
      </span>

      <span className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-sm font-semibold tabular-nums text-ink">{formatCurrency(pkg.price)}</span>
        {stats.savings > 0 && (
          <span className="text-[11px] font-medium tabular-nums text-ok">
            save {formatCurrency(stats.savings, { compact: true })}
          </span>
        )}
      </span>
    </button>
  );
}

function ProductTile({
  product,
  count,
  onPick,
}: {
  product: Product;
  count: number;
  onPick: () => void;
}): JSX.Element {
  const status = stockStatus(product);
  const available = product.stock - count;
  const disabled = available <= 0;

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      title={disabled ? `${product.name} is out of stock` : undefined}
      className={cn(
        TILE_BASE,
        disabled
          ? 'border-line bg-canvas'
          : 'border-line bg-surface hover:border-brand hover:bg-brand-soft',
      )}
    >
      <CountBadge count={count} />

      <span className="line-clamp-2 min-h-[2.2rem] pr-5 text-[13px] font-medium leading-snug text-ink">
        {product.name}
      </span>

      <span className="mt-1 truncate text-[11px] text-subtle">{product.brand}</span>

      <span className="mt-1.5 flex items-center justify-between gap-1">
        <span className="text-sm font-semibold tabular-nums text-ink">
          {formatCurrency(product.sellingPrice)}
        </span>
        {status === 'in-stock' ? (
          <span className="text-[11px] tabular-nums text-subtle">{available} left</span>
        ) : (
          <Badge tone={status === 'out' ? 'danger' : 'warn'}>
            {status === 'out' ? 'Out' : `${available} left`}
          </Badge>
        )}
      </span>
    </button>
  );
}
