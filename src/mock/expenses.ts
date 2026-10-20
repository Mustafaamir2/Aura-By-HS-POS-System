import { addDays, startOfMonth, subMonths } from 'date-fns';
import type { Expense, ExpenseCategory } from '@/types';
import { toISODate } from '@/utils/date';
import { makeRng } from '@/utils/random';
import { shops } from './shops';

const NOW = '2026-01-05T09:00:00.000Z';

interface Recurring {
  title: string;
  category: ExpenseCategory;
  /** Base amount per shop, in the same order as `shops`. */
  amounts: [number, number, number];
  dayOfMonth: number;
  description: string;
}

/** Fixed monthly outgoings every branch carries. */
const RECURRING: Recurring[] = [
  {
    title: 'Monthly rent',
    category: 'Rent',
    amounts: [450000, 380000, 520000],
    dayOfMonth: 1,
    description: 'Premises rent paid to the landlord.',
  },
  {
    title: 'Staff salaries',
    category: 'Salaries',
    amounts: [820000, 610000, 700000],
    dayOfMonth: 2,
    description: 'Consolidated payroll for the branch.',
  },
  {
    title: 'Electricity bill',
    category: 'Utilities',
    amounts: [96000, 74000, 112000],
    dayOfMonth: 12,
    description: 'LESCO / K-Electric billing for the month.',
  },
  {
    title: 'Internet & phone',
    category: 'Utilities',
    amounts: [14000, 14000, 16000],
    dayOfMonth: 14,
    description: 'Fibre connection and landline.',
  },
];

const ONE_OFF: { title: string; category: ExpenseCategory; min: number; max: number; description: string }[] = [
  { title: 'Product restock — hair care', category: 'Product Purchases', min: 85000, max: 260000, description: 'Restock order placed with Beauty Depot.' },
  { title: 'Product restock — skin care', category: 'Product Purchases', min: 60000, max: 180000, description: 'Restock order placed with Derma Line.' },
  { title: 'Colour & developer order', category: 'Product Purchases', min: 45000, max: 140000, description: 'Back-bar colour stock replenishment.' },
  { title: 'Air conditioner servicing', category: 'Maintenance', min: 12000, max: 38000, description: 'Routine servicing of floor units.' },
  { title: 'Salon chair repair', category: 'Maintenance', min: 8000, max: 26000, description: 'Hydraulic replacement and reupholstery.' },
  { title: 'Deep cleaning', category: 'Maintenance', min: 15000, max: 30000, description: 'Monthly professional deep clean.' },
  { title: 'Instagram ad campaign', category: 'Marketing', min: 25000, max: 90000, description: 'Paid social campaign for seasonal offers.' },
  { title: 'Influencer collaboration', category: 'Marketing', min: 40000, max: 150000, description: 'Collaboration post and story series.' },
  { title: 'Printed flyers & cards', category: 'Marketing', min: 9000, max: 28000, description: 'Loyalty cards and promotional flyers.' },
  { title: 'Staff training workshop', category: 'Other', min: 30000, max: 95000, description: 'External trainer for a colour masterclass.' },
  { title: 'Bank & card processing fees', category: 'Other', min: 6000, max: 22000, description: 'Merchant charges for the period.' },
  { title: 'Water & refreshments', category: 'Other', min: 5000, max: 15000, description: 'Tea, coffee and bottled water for clients.' },
];

const PAID_BY = ['Hira & Shumaila', 'Sana Tariq', 'Hina Raza', 'Rabia Naseem'];

/** Six months of history, so period filters and the trend chart have depth. */
export function buildExpenses(today: Date): Expense[] {
  const rng = makeRng(556677);
  const rows: Expense[] = [];
  let n = 0;

  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo -= 1) {
    const monthStart = startOfMonth(subMonths(today, monthsAgo));

    for (let shopIndex = 0; shopIndex < shops.length; shopIndex += 1) {
      const shop = shops[shopIndex]!;

      for (const item of RECURRING) {
        const spentOn = addDays(monthStart, item.dayOfMonth - 1);
        if (spentOn.getTime() > today.getTime()) continue;
        const baseAmount = item.amounts[shopIndex] ?? item.amounts[0];
        // Utilities drift month to month; rent and payroll are steady.
        const drift = item.category === 'Utilities' ? rng.int(-18, 22) / 100 : 0;
        n += 1;
        rows.push({
          id: `exp_${String(n).padStart(4, '0')}`,
          shopId: shop.id,
          createdAt: spentOn.toISOString(),
          updatedAt: NOW,
          title: item.title,
          category: item.category,
          amount: Math.round((baseAmount * (1 + drift)) / 100) * 100,
          spentOn: toISODate(spentOn),
          description: item.description,
          paidBy: PAID_BY[shopIndex + 1] ?? 'Hira & Shumaila',
        });
      }

      const extras = rng.int(2, 4);
      for (let i = 0; i < extras; i += 1) {
        const item = rng.pick(ONE_OFF);
        const spentOn = addDays(monthStart, rng.int(2, 27));
        if (spentOn.getTime() > today.getTime()) continue;
        n += 1;
        rows.push({
          id: `exp_${String(n).padStart(4, '0')}`,
          shopId: shop.id,
          createdAt: spentOn.toISOString(),
          updatedAt: NOW,
          title: item.title,
          category: item.category,
          amount: Math.round(rng.int(item.min, item.max) / 100) * 100,
          spentOn: toISODate(spentOn),
          description: item.description,
          paidBy: rng.pick(PAID_BY),
        });
      }
    }
  }

  return rows.sort((a, b) => b.spentOn.localeCompare(a.spentOn));
}
