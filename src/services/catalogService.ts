import type { Membership, Service, ServiceCategory, ServicePackage } from '@/types';
import { uid } from '@/utils/id';
import { round2 } from '@/utils/money';
import { commit, delay, nowISO, read, requireRow, ServiceError, stamped } from './db';
import { packageSavings } from './pricing';

/**
 * Services, categories, packages and memberships are shared across every branch
 * — one catalogue, one price list. Only an admin may edit them; shop users read.
 */

// ---------------------------------------------------------------- categories

export async function listCategories(): Promise<ServiceCategory[]> {
  return delay([...read().serviceCategories].sort((a, b) => a.sortOrder - b.sortOrder));
}

export function listCategoriesSync(): ServiceCategory[] {
  return [...read().serviceCategories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export interface CategoryInput {
  name: string;
  description: string;
  icon: string;
}

export async function createCategory(input: CategoryInput): Promise<ServiceCategory> {
  const row: ServiceCategory = stamped({
    id: uid('cat'),
    name: input.name.trim(),
    description: input.description.trim(),
    icon: input.icon,
    sortOrder: read().serviceCategories.length + 1,
    active: true,
  });
  return commit((db) => {
    db.serviceCategories = [...db.serviceCategories, row];
    return row;
  });
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ServiceCategory> {
  const existing = requireRow(read().serviceCategories.find((c) => c.id === id), 'That category');
  return commit((db) => {
    const next = { ...existing, ...input, name: input.name.trim(), updatedAt: nowISO() };
    db.serviceCategories = db.serviceCategories.map((c) => (c.id === id ? next : c));
    return next;
  });
}

export async function setCategoryActive(id: string, active: boolean): Promise<void> {
  await commit((db) => {
    db.serviceCategories = db.serviceCategories.map((c) =>
      c.id === id ? { ...c, active, updatedAt: nowISO() } : c,
    );
  });
}

export async function deleteCategory(id: string): Promise<void> {
  const inUse = read().services.filter((s) => s.categoryId === id);
  if (inUse.length > 0) {
    throw new ServiceError(
      `${inUse.length} service${inUse.length === 1 ? '' : 's'} still use this category. Move them first.`,
      'conflict',
    );
  }
  await commit((db) => {
    db.serviceCategories = db.serviceCategories.filter((c) => c.id !== id);
  });
}

// ------------------------------------------------------------------ services

export async function listServices(): Promise<Service[]> {
  return delay(read().services);
}

export function listServicesSync(): Service[] {
  return read().services;
}

export function getServiceSync(id: string): Service | undefined {
  return read().services.find((s) => s.id === id);
}

export function serviceName(id: string): string {
  return read().services.find((s) => s.id === id)?.name ?? 'Unknown service';
}

export interface ServiceInput {
  name: string;
  categoryId: string;
  description: string;
  durationMin: number;
  price: number;
  discountPct: number;
  imageUrl: string | null;
}

/** Price after the service's own discount — what booking and billing charge. */
export function effectivePrice(service: Pick<Service, 'price' | 'discountPct'>): number {
  return round2(service.price * (1 - service.discountPct / 100));
}

export async function createService(input: ServiceInput): Promise<Service> {
  const row: Service = stamped({
    id: uid('svc'),
    name: input.name.trim(),
    categoryId: input.categoryId,
    description: input.description.trim(),
    durationMin: input.durationMin,
    price: input.price,
    discountPct: input.discountPct,
    imageUrl: input.imageUrl,
    active: true,
  });
  return commit((db) => {
    db.services = [row, ...db.services];
    return row;
  });
}

/**
 * A price change takes effect immediately for new bookings and bills. Prices
 * already captured on past appointments are untouched by design.
 */
export async function updateService(id: string, input: ServiceInput): Promise<Service> {
  const existing = requireRow(read().services.find((s) => s.id === id), 'That service');
  return commit((db) => {
    const next: Service = {
      ...existing,
      ...input,
      name: input.name.trim(),
      description: input.description.trim(),
      updatedAt: nowISO(),
    };
    db.services = db.services.map((s) => (s.id === id ? next : s));
    return next;
  });
}

export async function setServiceActive(id: string, active: boolean): Promise<Service> {
  const existing = requireRow(read().services.find((s) => s.id === id), 'That service');
  return commit((db) => {
    const next = { ...existing, active, updatedAt: nowISO() };
    db.services = db.services.map((s) => (s.id === id ? next : s));
    return next;
  });
}

/** Staff qualified for a service, used by the booking form's stylist list. */
export function qualifiedStaffFor(serviceId: string, shopId: string | null): string[] {
  return read()
    .staff.filter((s) => s.active && s.specializations.includes(serviceId))
    .filter((s) => shopId === null || s.shopId === shopId)
    .map((s) => s.id);
}

/** Replace the set of staff qualified for a service, from the service editor. */
export async function setQualifiedStaff(serviceId: string, staffIds: string[]): Promise<void> {
  await commit((db) => {
    db.staff = db.staff.map((member) => {
      const shouldHave = staffIds.includes(member.id);
      const has = member.specializations.includes(serviceId);
      if (shouldHave === has) return member;
      return {
        ...member,
        specializations: shouldHave
          ? [...member.specializations, serviceId]
          : member.specializations.filter((id) => id !== serviceId),
        updatedAt: nowISO(),
      };
    });
  });
}

// ------------------------------------------------------------------ packages

export async function listPackages(): Promise<ServicePackage[]> {
  return delay(read().packages);
}

export function listPackagesSync(): ServicePackage[] {
  return read().packages;
}

export interface PackageStats {
  individualTotal: number;
  savings: number;
  savingsPct: number;
  durationMin: number;
}

/** Individual total, savings and duration, always derived from the members. */
export function packageStats(pkg: ServicePackage): PackageStats {
  const catalogue = read().services;
  let individualTotal = 0;
  let durationMin = 0;

  for (const item of pkg.items) {
    const service = catalogue.find((s) => s.id === item.serviceId);
    if (!service) continue;
    individualTotal += effectivePrice(service) * item.quantity;
    durationMin += service.durationMin * item.quantity;
  }

  const { amount, percent } = packageSavings(pkg.price, round2(individualTotal));
  return { individualTotal: round2(individualTotal), savings: amount, savingsPct: percent, durationMin };
}

export interface PackageInput {
  name: string;
  description: string;
  items: { serviceId: string; quantity: number }[];
  price: number;
  imageUrl: string | null;
}

export async function createPackage(input: PackageInput): Promise<ServicePackage> {
  if (input.items.length < 2) {
    throw new ServiceError('A package needs at least two services.', 'validation');
  }
  const row: ServicePackage = stamped({
    id: uid('pkg'),
    name: input.name.trim(),
    description: input.description.trim(),
    items: input.items,
    price: input.price,
    imageUrl: input.imageUrl,
    active: true,
  });
  return commit((db) => {
    db.packages = [row, ...db.packages];
    return row;
  });
}

export async function updatePackage(id: string, input: PackageInput): Promise<ServicePackage> {
  const existing = requireRow(read().packages.find((p) => p.id === id), 'That package');
  if (input.items.length < 2) {
    throw new ServiceError('A package needs at least two services.', 'validation');
  }
  return commit((db) => {
    const next = { ...existing, ...input, name: input.name.trim(), updatedAt: nowISO() };
    db.packages = db.packages.map((p) => (p.id === id ? next : p));
    return next;
  });
}

export async function setPackageActive(id: string, active: boolean): Promise<void> {
  await commit((db) => {
    db.packages = db.packages.map((p) => (p.id === id ? { ...p, active, updatedAt: nowISO() } : p));
  });
}

// --------------------------------------------------------------- memberships

export async function listMemberships(): Promise<Membership[]> {
  return delay(read().memberships);
}

export function listMembershipsSync(): Membership[] {
  return read().memberships;
}

export interface MembershipInput {
  name: Membership['name'];
  description: string;
  price: number;
  validityDays: number;
  discountPct: number;
  benefits: string[];
  includedServiceIds: string[];
}

export async function createMembership(input: MembershipInput): Promise<Membership> {
  const row: Membership = stamped({
    id: uid('mem'),
    ...input,
    description: input.description.trim(),
    active: true,
  });
  return commit((db) => {
    db.memberships = [...db.memberships, row];
    return row;
  });
}

export async function updateMembership(id: string, input: MembershipInput): Promise<Membership> {
  const existing = requireRow(read().memberships.find((m) => m.id === id), 'That membership');
  return commit((db) => {
    const next = { ...existing, ...input, updatedAt: nowISO() };
    db.memberships = db.memberships.map((m) => (m.id === id ? next : m));
    return next;
  });
}

export async function setMembershipActive(id: string, active: boolean): Promise<void> {
  await commit((db) => {
    db.memberships = db.memberships.map((m) =>
      m.id === id ? { ...m, active, updatedAt: nowISO() } : m,
    );
  });
}

/** How many customers currently hold each tier. */
export function membershipHolderCount(membershipId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return read().customerMemberships.filter(
    (m) => m.membershipId === membershipId && m.status === 'active' && m.expiresOn >= today,
  ).length;
}
