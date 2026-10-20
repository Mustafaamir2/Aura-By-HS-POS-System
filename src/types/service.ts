import type { BaseRecord } from './common';

export interface ServiceCategory extends BaseRecord {
  name: string;
  description: string;
  /** Key into the shared icon registry. */
  icon: string;
  sortOrder: number;
  active: boolean;
}

export interface Service extends BaseRecord {
  name: string;
  categoryId: string;
  description: string;
  durationMin: number;
  price: number;
  /** Percent off the list price, 0-100. Applied before any bill-level discount. */
  discountPct: number;
  imageUrl: string | null;
  active: boolean;
}
