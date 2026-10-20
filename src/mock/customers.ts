import type { Customer, CustomerMembership } from '@/types';
import { makeRng } from '@/utils/random';
import { toISODate } from '@/utils/date';
import { addDays, subDays } from 'date-fns';
import {
  CUSTOMER_NOTES,
  EMAIL_DOMAINS,
  FEMALE_FIRST,
  LAST_NAMES,
  MALE_FIRST,
  PHONE_PREFIXES,
  SENSITIVITIES,
} from './names';
import { memberships } from './catalog';
import { SHOP_IDS } from './shops';
import { staff } from './staff';

const NOW = '2026-01-05T09:00:00.000Z';
const SHOP_LIST = [SHOP_IDS.gulberg, SHOP_IDS.dha, SHOP_IDS.clifton];

/** Enough to exercise pagination, search and the top-customers report. */
const COUNT = 72;

export function buildCustomers(today: Date): Customer[] {
  const rng = makeRng(20260105);
  const rows: Customer[] = [];
  const usedPhones = new Set<string>();

  for (let i = 0; i < COUNT; i += 1) {
    // Roughly one man in six, which matches a unisex salon's real mix.
    const isMale = rng.next() < 0.17;
    const first = isMale ? rng.pick(MALE_FIRST) : rng.pick(FEMALE_FIRST);
    const last = rng.pick(LAST_NAMES);
    const name = `${first} ${last}`;

    // Phone numbers must be unique — the customer form enforces this too.
    let phone = '';
    do {
      phone = `${rng.pick(PHONE_PREFIXES)} ${String(rng.int(1000000, 9999999))}`;
    } while (usedPhones.has(phone));
    usedPhones.add(phone);

    const shopId = rng.weighted(SHOP_LIST, [5, 3, 2]);
    const hasEmail = rng.next() < 0.72;
    const daysSinceFirst = rng.int(20, 900);

    rows.push({
      id: `cus_${String(i + 1).padStart(4, '0')}`,
      shopId,
      createdAt: subDays(today, daysSinceFirst).toISOString(),
      updatedAt: NOW,
      name,
      phone,
      email: hasEmail
        ? `${first.toLowerCase()}.${last.toLowerCase()}${rng.int(1, 99)}@${rng.pick(EMAIL_DOMAINS)}`
        : null,
      gender: isMale ? 'male' : 'female',
      preferredStaffId: null, // filled in below, once we know who works where
      preferredServiceIds: [],
      sensitivities: rng.pick(SENSITIVITIES),
      notes: rng.pick(CUSTOMER_NOTES),
      active: rng.next() > 0.04,
      firstVisitOn: toISODate(subDays(today, daysSinceFirst)),
    });
  }

  // Preferred stylist must belong to the customer's own shop.
  for (const customer of rows) {
    if (rng.next() < 0.45) {
      const candidates = staff.filter(
        (s) => s.shopId === customer.shopId && s.active && s.specializations.length > 0,
      );
      if (candidates.length > 0) customer.preferredStaffId = rng.pick(candidates).id;
    }
    if (rng.next() < 0.6) {
      customer.preferredServiceIds = rng.sample(
        ['svc_0001', 'svc_0004', 'svc_0005', 'svc_0014', 'svc_0021', 'svc_0022', 'svc_0024', 'svc_0036'],
        rng.int(1, 3),
      );
    }
  }

  return rows;
}

/** About a quarter of the book holds a membership, skewed towards Silver. */
export function buildCustomerMemberships(
  customers: Customer[],
  today: Date,
): CustomerMembership[] {
  const rng = makeRng(90210);
  const rows: CustomerMembership[] = [];
  let n = 0;

  for (const customer of customers) {
    if (rng.next() > 0.26) continue;
    const tier = rng.weighted(memberships, [5, 3, 1.4]);
    // Spread start dates so some are expiring soon and a few have lapsed.
    const startedDaysAgo = rng.int(10, tier.validityDays + 90);
    const startsOn = subDays(today, startedDaysAgo);
    const expiresOn = addDays(startsOn, tier.validityDays);
    const expired = expiresOn.getTime() < today.getTime();

    n += 1;
    rows.push({
      id: `cmem_${String(n).padStart(4, '0')}`,
      createdAt: startsOn.toISOString(),
      updatedAt: NOW,
      customerId: customer.id,
      membershipId: tier.id,
      shopId: customer.shopId,
      startsOn: toISODate(startsOn),
      expiresOn: toISODate(expiresOn),
      status: expired ? 'expired' : 'active',
    });
  }

  return rows;
}
