import type { AppNotification, NotificationSeverity, NotificationType } from '@/types';
import { uid } from '@/utils/id';
import { commit, delay, nowISO, read, scopeTo, write } from './db';

/**
 * Notifications are raised by the services that cause them — booking a slot,
 * taking a payment, moving stock — so the bell always reflects real activity
 * rather than a scripted list.
 */

export interface RaiseInput {
  shopId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  severity?: NotificationSeverity;
}

const DEFAULT_SEVERITY: Record<NotificationType, NotificationSeverity> = {
  'appointment-created': 'info',
  'appointment-reminder': 'warning',
  'appointment-cancelled': 'warning',
  'appointment-rescheduled': 'info',
  'appointment-no-show': 'danger',
  'payment-completed': 'success',
  refund: 'warning',
  'low-stock': 'warning',
  'out-of-stock': 'danger',
  'customer-created': 'info',
  'membership-expiring': 'info',
};

/**
 * Synchronous on purpose: callers raise notifications inside a larger write and
 * must not have to await them. Respects the per-type switches in settings.
 */
export function raise(input: RaiseInput): void {
  const db = read();
  if (db.settings.notifications[input.type] === false) return;

  const at = nowISO();
  const row: AppNotification = {
    id: uid('ntf'),
    shopId: input.shopId,
    createdAt: at,
    updatedAt: at,
    type: input.type,
    title: input.title,
    message: input.message,
    read: false,
    link: input.link ?? null,
    severity: input.severity ?? DEFAULT_SEVERITY[input.type],
  };

  write((current) => {
    current.notifications = [row, ...current.notifications];
  });
}

export async function list(shopId: string | null): Promise<AppNotification[]> {
  const rows = scopeTo(read().notifications, shopId);
  return delay([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export function listSync(shopId: string | null): AppNotification[] {
  const rows = scopeTo(read().notifications, shopId);
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadCount(shopId: string | null): number {
  return scopeTo(read().notifications, shopId).filter((n) => !n.read).length;
}

export async function markRead(id: string): Promise<void> {
  await commit((db) => {
    db.notifications = db.notifications.map((n) =>
      n.id === id ? { ...n, read: true, updatedAt: nowISO() } : n,
    );
  });
}

export async function markUnread(id: string): Promise<void> {
  await commit((db) => {
    db.notifications = db.notifications.map((n) =>
      n.id === id ? { ...n, read: false, updatedAt: nowISO() } : n,
    );
  });
}

export async function markAllRead(shopId: string | null): Promise<number> {
  return commit((db) => {
    let changed = 0;
    db.notifications = db.notifications.map((n) => {
      const inScope = shopId === null || n.shopId === shopId;
      if (!inScope || n.read) return n;
      changed += 1;
      return { ...n, read: true, updatedAt: nowISO() };
    });
    return changed;
  });
}

export async function remove(id: string): Promise<void> {
  await commit((db) => {
    db.notifications = db.notifications.filter((n) => n.id !== id);
  });
}

/** Clears every notification in scope. Used by the "Clear all" action. */
export async function clearAll(shopId: string | null): Promise<number> {
  return commit((db) => {
    const before = db.notifications.length;
    db.notifications = shopId === null ? [] : db.notifications.filter((n) => n.shopId !== shopId);
    return before - db.notifications.length;
  });
}
