import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CalendarX,
  CheckCheck,
  PackageX,
  Receipt,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { AppNotification, NotificationType } from '@/types';
import { cn } from '@/utils/cn';
import { formatRelative, formatDateTime } from '@/utils/date';
import { useDb } from '@/hooks/useDb';
import { useShopScope } from '@/hooks/useShopScope';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useConfirm } from '@/hooks/useConfirm';
import { useAuthStore } from '@/store/authStore';
import * as notificationService from '@/services/notificationService';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FilterChips } from '@/components/ui/FilterBar';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { matches } from '@/utils/text';

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

const SEVERITY_STYLES: Record<AppNotification['severity'], string> = {
  info: 'bg-info-soft text-info',
  success: 'bg-ok-soft text-ok',
  warning: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
};

/** Groups of types, so the filter row stays short. */
const GROUPS: { value: string; label: string; types: NotificationType[] }[] = [
  {
    value: 'appointments',
    label: 'Appointments',
    types: [
      'appointment-created',
      'appointment-reminder',
      'appointment-cancelled',
      'appointment-rescheduled',
      'appointment-no-show',
    ],
  },
  { value: 'payments', label: 'Payments', types: ['payment-completed', 'refund'] },
  { value: 'stock', label: 'Stock', types: ['low-stock', 'out-of-stock'] },
  { value: 'customers', label: 'Customers', types: ['customer-created', 'membership-expiring'] },
];

export function NotificationsPage(): JSX.Element {
  const db = useDb();
  const { shopId } = useShopScope();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const confirm = useConfirm();
  const role = useAuthStore((s) => s.user?.role);

  const basePath = pathname.startsWith('/admin') ? '/admin' : '/shop';

  const [group, setGroup] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState('');

  const scoped = useMemo(
    () =>
      db.notifications
        .filter((n) => shopId === null || n.shopId === shopId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [db.notifications, shopId],
  );

  const filtered = useMemo(
    () =>
      scoped.filter((notification) => {
        if (unreadOnly && notification.read) return false;
        if (group !== 'all') {
          const types = GROUPS.find((g) => g.value === group)?.types ?? [];
          if (!types.includes(notification.type)) return false;
        }
        if (search && !matches(notification.title, search) && !matches(notification.message, search)) {
          return false;
        }
        return true;
      }),
    [scoped, unreadOnly, group, search],
  );

  const unread = scoped.filter((n) => !n.read).length;

  const markAll = useAsyncAction(
    async () => notificationService.markAllRead(shopId),
    { successMessage: (count) => `${count} notification${count === 1 ? '' : 's'} marked as read.` },
  );

  const clearAll = useAsyncAction(
    async () => notificationService.clearAll(shopId),
    { successMessage: (count) => `${count} notification${count === 1 ? '' : 's'} cleared.` },
  );

  const onClear = async (): Promise<void> => {
    const result = await confirm({
      title: 'Clear all notifications?',
      description: `${scoped.length} notification${scoped.length === 1 ? '' : 's'} will be removed. New ones will keep arriving as things happen.`,
      confirmLabel: 'Clear all',
      tone: 'danger',
    });
    if (!result.confirmed) return;
    await clearAll.run();
  };

  const open = (notification: AppNotification): void => {
    if (!notification.read) void notificationService.markRead(notification.id);
    if (notification.link) navigate(`${basePath}${notification.link}`);
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          role === 'admin'
            ? 'Raised automatically by bookings, payments and stock movements across every branch.'
            : 'Everything happening at your branch.'
        }
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<CheckCheck />}
              disabled={unread === 0}
              loading={markAll.pending}
              onClick={() => void markAll.run()}
            >
              Mark all read
            </Button>
            <Button
              variant="outline"
              leftIcon={<Trash2 />}
              disabled={scoped.length === 0}
              loading={clearAll.pending}
              onClick={() => void onClear()}
            >
              Clear all
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search notifications…"
            className="w-full sm:w-64"
            label="Search notifications"
          />

          <FilterChips
            label="Notification type"
            value={group}
            onChange={setGroup}
            options={[
              { value: 'all', label: 'All', count: scoped.length },
              ...GROUPS.map((g) => ({
                value: g.value,
                label: g.label,
                count: scoped.filter((n) => g.types.includes(n.type)).length,
              })),
            ]}
          />

          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly((v) => !v)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
              unreadOnly
                ? 'border-brand bg-brand text-brand-ink'
                : 'border-line bg-surface text-muted hover:border-subtle hover:text-ink',
            )}
          >
            Unread only
            {unread > 0 && (
              <span className={unreadOnly ? 'text-brand-ink/70' : 'text-subtle'}>{unread}</span>
            )}
          </button>
        </div>
      </PageHeader>

      <Card flush>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Bell />}
            title={unread === 0 && !search && group === 'all' ? "You're all caught up" : 'Nothing matches'}
            description={
              unread === 0 && !search && group === 'all'
                ? 'New notifications appear here as bookings are made, payments taken and stock moves.'
                : 'Try a different filter or search term.'
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((notification) => (
              <li key={notification.id}>
                <div
                  className={cn(
                    'flex items-start gap-3 px-4 py-3.5 transition-colors',
                    !notification.read && 'bg-brand-soft/40',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl [&>svg]:h-[18px] [&>svg]:w-[18px]',
                      SEVERITY_STYLES[notification.severity],
                    )}
                    aria-hidden
                  >
                    {ICONS[notification.type]}
                  </span>

                  <button
                    type="button"
                    onClick={() => open(notification)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink">{notification.title}</span>
                      {!notification.read && <Badge tone="brand">New</Badge>}
                      {shopId === null && (
                        <Badge tone="neutral">
                          {db.shops.find((s) => s.id === notification.shopId)?.name ?? '—'}
                        </Badge>
                      )}
                    </span>

                    <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                      {notification.message}
                    </span>

                    <span
                      className="mt-1 block text-xs text-subtle"
                      title={formatDateTime(notification.createdAt)}
                    >
                      {formatRelative(notification.createdAt)}
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void (notification.read
                          ? notificationService.markUnread(notification.id)
                          : notificationService.markRead(notification.id))
                      }
                    >
                      {notification.read ? 'Unread' : 'Read'}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete notification"
                      onClick={() => void notificationService.remove(notification.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default NotificationsPage;
