import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useScopeStore } from '@/store/scopeStore';
import { useTable } from './useDb';
import type { Shop } from '@/types';

export interface ShopScope {
  /** The shop every query should be filtered by. `null` means all shops. */
  shopId: string | null;
  /** True when the user may switch between branches. */
  canSwitch: boolean;
  /** True when the current view spans every branch. */
  isAllShops: boolean;
  /** The resolved shop record, or null in "all shops" mode. */
  shop: Shop | null;
  shops: Shop[];
  setShopId: (shopId: string | null) => void;
}

/**
 * Resolves which shop's data the current user should see.
 *
 * For a shop account this is always their own `shopId` and the switcher is
 * hidden — the value never comes from anything the user can change. For an
 * admin it follows the top-bar switcher.
 */
export function useShopScope(): ShopScope {
  const user = useAuthStore((s) => s.user);
  const adminShopId = useScopeStore((s) => s.adminShopId);
  const setAdminShopId = useScopeStore((s) => s.setAdminShopId);
  const shops = useTable('shops');

  return useMemo(() => {
    const isAdmin = user?.role === 'admin';
    const shopId = isAdmin ? adminShopId : (user?.shopId ?? null);
    return {
      shopId,
      canSwitch: isAdmin,
      isAllShops: shopId === null,
      shop: shopId ? (shops.find((s) => s.id === shopId) ?? null) : null,
      shops: isAdmin ? shops : shops.filter((s) => s.id === user?.shopId),
      setShopId: setAdminShopId,
    };
  }, [user, adminShopId, shops, setAdminShopId]);
}

/**
 * The shop a write should be attributed to. Admins must have picked a specific
 * branch before they can create shop-scoped records, since "all shops" is not
 * somewhere a booking can live.
 */
export function useWriteShopId(): string | null {
  const { shopId } = useShopScope();
  return shopId;
}
