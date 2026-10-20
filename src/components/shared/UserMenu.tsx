import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, Store, UserCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useShopScope } from '@/hooks/useShopScope';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown, DropdownDivider, DropdownItem, DropdownLabel } from '@/components/ui/Dropdown';

export function UserMenu(): JSX.Element | null {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { shop } = useShopScope();
  const navigate = useNavigate();

  if (!user) return null;

  const isAdmin = user.role === 'admin';

  const signOut = async (): Promise<void> => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Dropdown
      panelClassName="min-w-[15rem]"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Account menu"
          className="flex items-center gap-2 rounded-xl p-1 pr-1.5 transition-colors hover:bg-line/60"
        >
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          <span className="hidden min-w-0 text-left lg:block">
            <span className="block truncate text-[13px] font-medium leading-tight text-ink">
              {user.name}
            </span>
            <span className="block truncate text-[11px] leading-tight text-subtle">
              {isAdmin ? 'Owner' : (shop?.name ?? 'Branch')}
            </span>
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-subtle lg:block" aria-hidden />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>

          <DropdownDivider />
          <DropdownLabel>Signed in as</DropdownLabel>
          <div className="flex items-center gap-2 px-2.5 pb-2 text-sm text-ink">
            {isAdmin ? (
              <>
                <UserCircle2 className="h-4 w-4 text-brand" aria-hidden />
                Business owner
              </>
            ) : (
              <>
                <Store className="h-4 w-4 text-brand" aria-hidden />
                <span className="truncate">{shop?.name ?? 'Branch account'}</span>
              </>
            )}
          </div>

          <DropdownDivider />

          <DropdownItem
            icon={<Settings />}
            onClick={() => {
              close();
              navigate(isAdmin ? '/admin/settings' : '/shop/profile');
            }}
          >
            {isAdmin ? 'Settings' : 'Shop profile'}
          </DropdownItem>

          <DropdownDivider />

          <DropdownItem icon={<LogOut />} tone="danger" onClick={() => void signOut()}>
            Sign out
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}
