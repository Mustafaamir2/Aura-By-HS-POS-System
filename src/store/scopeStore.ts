import { create } from 'zustand';
import { readJSON, writeJSON } from '@/utils/storage';

/**
 * Which shop the admin is currently looking at. `null` means "All shops".
 *
 * Shop users never read this — their scope comes from `user.shopId` and is
 * enforced in the service layer, so a shop account cannot widen its own view
 * by fiddling with this store.
 */
interface ScopeState {
  /** Admin's chosen shop, or null for all shops. */
  adminShopId: string | null;
  setAdminShopId: (shopId: string | null) => void;
}

const KEY = 'admin-shop-scope';

export const useScopeStore = create<ScopeState>()((set) => ({
  adminShopId: readJSON<string | null>(KEY, null),
  setAdminShopId: (adminShopId) => {
    writeJSON(KEY, adminShopId);
    set({ adminShopId });
  },
}));
