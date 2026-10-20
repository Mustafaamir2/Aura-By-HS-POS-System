import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CalendarX,
  CheckCheck,
  PackageX,
  Receipt,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatRelative } from '@/utils/date';
import type { AppNotification, NotificationType } from '@/types';
import { useTable } from '@/hooks/useDb';
import { useShopScope } from '@/hooks/useShopScope';
import { useAuthStore } from '@/store/authStore';
import * as notificationService from '@/services/notificationService';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';

const ICONS: Record<NotificationType, JSX.Element> = {
  'appointment-created': <CalendarCheck />,
  'appointment-reminder': <Bell />,
  'appointment-cancelled': <CalendarX />,
  'appointment-rescheduled': <CalendarCheck />,
  'appointment-no-show': <CalendarX />,
  'payment-completed': <Receipt />,
  refund: <Receipt />,
  'low-stock': <AlertTriangle />,
  'out-of-stock': <PackageX />,
  'customer-created': <UserPlus />,
  'membership-expiring': <AlertTriangle />,
};

const SEVERITY: Record<AppNotification['severity'], string> = {
  info: 'bg-info-soft text-info',
  success: 'bg-ok-soft text-ok',
  warning: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
};

export function NotificationBell(): JSX.Element {
  const notifications = useTable('notifications');
  const { shopId } = useShopScope();
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();

  const scoped = useMemo(
    () =>
      notifications
        .filter((n) => shopId === null || n.shopId === shopId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notifications, shopId],
  );

  const unread = scoped.filter((n) => !n.read).length;
  const recent = scoped.slice(0, 8);
  const allHref = role === 'admin' ? '/admin/notifications' : '/shop/notifications';

  const open = (notification: AppNotification, close: () => void): void => {
    void notificationService.markRead(notification.id);
    close();
    if (notification.link) {
      // Notification links are stored portal-agnostic; prefix them per role.
      const prefix = role === 'admin' ? '/admin' : '/shop';
      navigate(`${prefix}${notification.link}`);
    }
  };

  return (
    <Dropdown
      panelClassName="w-[min(24rem,calc(100vw-2rem))] p-0"
      trigger={({ open: isOpen, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          className={cn(
            'relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-line/60 hover:text-ink',
            isOpen && 'bg-line/60 text-ink',
          )}
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden />
          {unread > 0 && (
            <span
              className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-badge px-1 text-[10px] font-bold leading-none text-badge-ink tabular-nums shadow-sm ring-2 ring-surface"
              aria-hidden
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="flex max-h-[min(30rem,80vh)] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
              Notifications
              {unread > 0 && (
                <span className="rounded-full bg-brand-soft px-2 py-0.5 font-sans text-[11px] font-semibold text-brand tabular-nums">
                  {unread} new
                </span>
              )}
            </p>
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<CheckCheck />}
                onClick={() => void notificationService.markAllRead(shopId)}
              >
                Mark all read
              </Button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {recent.length === 0 ? (
              <EmptyState compact title="You're all caught up" icon={<Bell />} />
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => open(notification, close)}
                      className={cn(
                        // Unread is carried by a brand edge + faint wash rather
                        // than a heavy fill, which went muddy on dark maroon.
                        'relative flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-line/40',
                        !notification.read &&
                          'bg-brand/[0.05] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-brand',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg [&>svg]:h-4 [&>svg]:w-4',
                          SEVERITY[notification.severity],
                        )}
                        aria-hidden
                      >
                        {ICONS[notification.type]}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span
                            className={cn(
                              'min-w-0 flex-1 text-[13px] leading-snug text-ink',
                              notification.read ? 'font-medium' : 'font-semibold',
                            )}
                          >
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand ring-2 ring-brand/20" aria-hidden />
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-muted line-clamp-2">
                          {notification.message}
                        </span>
                        <span className="mt-1 block text-[11px] text-subtle">
                          {formatRelative(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to={allHref}
            onClick={close}
            className="border-t border-line px-4 py-3 text-center text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
          >
            View all notifications
          </Link>
        </div>
      )}
    </Dropdown>
  );
}
