import type { BaseRecord } from './common';

export interface PackageItem {
  serviceId: string;
  quantity: number;
}

export interface ServicePackage extends BaseRecord {
  name: string;
  description: string;
  items: PackageItem[];
  /** Bundled price the customer pays; savings are derived from the members. */
  price: number;
  imageUrl: string | null;
  active: boolean;
}

export type MembershipTierName = 'Silver' | 'Gold' | 'Platinum';

export interface Membership extends BaseRecord {
  name: MembershipTierName;
  description: string;
  price: number;
  validityDays: number;
  discountPct: number;
  benefits: string[];
  /** Services included at no charge while the membership is active. */
  includedServiceIds: string[];
  active: boolean;
}

export interface CustomerMembership extends BaseRecord {
  customerId: string;
  membershipId: string;
  shopId: string;
  /** yyyy-MM-dd */
  startsOn: string;
  /** yyyy-MM-dd */
  expiresOn: string;
  status: 'active' | 'expired' | 'cancelled';
}
