import type { BaseRecord, ShopScoped } from './common';

export type NotificationType =
  | 'appointment-created'
  | 'appointment-reminder'
  | 'appointment-cancelled'
  | 'appointment-rescheduled'
  | 'appointment-no-show'
  | 'payment-completed'
  | 'refund'
  | 'low-stock'
  | 'out-of-stock'
  | 'customer-created'
  | 'membership-expiring';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface AppNotification extends BaseRecord, ShopScoped {
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  /** In-app route to the record that triggered it. */
  link: string | null;
  severity: NotificationSeverity;
}
