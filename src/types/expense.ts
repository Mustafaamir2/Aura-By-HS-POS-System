import type { BaseRecord, ShopScoped } from './common';

export type ExpenseCategory =
  | 'Rent'
  | 'Salaries'
  | 'Utilities'
  | 'Product Purchases'
  | 'Maintenance'
  | 'Marketing'
  | 'Other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Salaries',
  'Utilities',
  'Product Purchases',
  'Maintenance',
  'Marketing',
  'Other',
];

export interface Expense extends BaseRecord, ShopScoped {
  title: string;
  category: ExpenseCategory;
  amount: number;
  /** yyyy-MM-dd */
  spentOn: string;
  description: string;
  paidBy: string;
}
