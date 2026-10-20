import { parseISO } from 'date-fns';
import type { Expense, ExpenseCategory } from '@/types';
import { uid } from '@/utils/id';
import { round2 } from '@/utils/money';
import { commit, delay, nowISO, read, requireRow, scopeTo, ServiceError, stamped } from './db';

export interface ExpenseInput {
  shopId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  spentOn: string;
  description: string;
  paidBy: string;
}

export async function list(shopId: string | null): Promise<Expense[]> {
  const rows = scopeTo(read().expenses, shopId);
  return delay([...rows].sort((a, b) => b.spentOn.localeCompare(a.spentOn)));
}

export function listSync(shopId: string | null): Expense[] {
  return [...scopeTo(read().expenses, shopId)].sort((a, b) => b.spentOn.localeCompare(a.spentOn));
}

export async function create(input: ExpenseInput): Promise<Expense> {
  if (input.amount <= 0) throw new ServiceError('Enter an amount greater than zero.', 'validation');

  const row: Expense = stamped({
    id: uid('exp'),
    shopId: input.shopId,
    title: input.title.trim(),
    category: input.category,
    amount: round2(input.amount),
    spentOn: input.spentOn,
    description: input.description.trim(),
    paidBy: input.paidBy.trim(),
  });

  return commit((db) => {
    db.expenses = [row, ...db.expenses];
    return row;
  });
}

export async function update(id: string, input: ExpenseInput): Promise<Expense> {
  const existing = requireRow(read().expenses.find((e) => e.id === id), 'That expense');
  if (input.amount <= 0) throw new ServiceError('Enter an amount greater than zero.', 'validation');

  return commit((db) => {
    const next: Expense = {
      ...existing,
      ...input,
      title: input.title.trim(),
      amount: round2(input.amount),
      updatedAt: nowISO(),
    };
    db.expenses = db.expenses.map((e) => (e.id === id ? next : e));
    return next;
  });
}

export async function remove(id: string): Promise<void> {
  requireRow(read().expenses.find((e) => e.id === id), 'That expense');
  await commit((db) => {
    db.expenses = db.expenses.filter((e) => e.id !== id);
  });
}

/** Total spend in a window, used by the reports' profit calculation. */
export function totalBetween(shopId: string | null, from: Date, to: Date): number {
  return round2(
    scopeTo(read().expenses, shopId)
      .filter((e) => {
        const t = parseISO(e.spentOn).getTime();
        return t >= from.getTime() && t <= to.getTime();
      })
      .reduce((sum, e) => sum + e.amount, 0),
  );
}

export interface CategoryBreakdown {
  category: ExpenseCategory;
  amount: number;
  count: number;
  percent: number;
}

export function breakdownByCategory(rows: Expense[]): CategoryBreakdown[] {
  const total = rows.reduce((sum, e) => sum + e.amount, 0);
  const map = new Map<ExpenseCategory, { amount: number; count: number }>();

  for (const row of rows) {
    const entry = map.get(row.category) ?? { amount: 0, count: 0 };
    entry.amount += row.amount;
    entry.count += 1;
    map.set(row.category, entry);
  }

  return [...map.entries()]
    .map(([category, entry]) => ({
      category,
      amount: round2(entry.amount),
      count: entry.count,
      percent: total > 0 ? round2((entry.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}
