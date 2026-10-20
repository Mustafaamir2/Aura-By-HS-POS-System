import { Menu, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Logo } from './Logo';
import { ShopSwitcher } from './ShopSwitcher';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function Topbar(): JSX.Element {
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();

  const prefix = role === 'admin' ? '/admin' : '/shop';

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface/85 px-3 backdrop-blur-md sm:px-5">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-line/60 hover:text-ink lg:hidden"
      >
        <Menu className="h-[18px] w-[18px]" aria-hidden />
      </button>

      {/* The rail carries the logo from lg up, so only show it on small screens. */}
      <Logo size="sm" className="lg:hidden" markOnly />

      <ShopSwitcher className="hidden sm:block" />

      <div className="flex-1" />

      <Button
        size="sm"
        leftIcon={<Plus />}
        className="hidden sm:inline-flex"
        onClick={() => navigate(`${prefix}/billing`)}
      >
        New sale
      </Button>

      <ThemeToggle />
      <NotificationBell />
      <UserMenu />
    </header>
  );
}
