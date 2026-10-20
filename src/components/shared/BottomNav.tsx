import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { SHOP_BOTTOM_NAV } from '@/app/navigation';

/**
 * Thumb-reachable navigation for the shop portal on phones. The front desk
 * works on a tablet or a phone far more often than a laptop, so the four
 * things they do all day live here rather than behind a hamburger.
 */
export function BottomNav(): JSX.Element {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Quick navigation"
      className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {SHOP_BOTTOM_NAV.map((item) => {
        const active = item.match
          ? pathname === item.match || pathname.startsWith(`${item.match}/`)
          : pathname === item.to;
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={!item.match}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              active ? 'text-brand' : 'text-subtle',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="truncate px-1">{item.label.split(' ')[0]}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
