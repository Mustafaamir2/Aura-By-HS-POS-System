import { Check, ChevronsUpDown, Store } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useShopScope } from '@/hooks/useShopScope';
import { Dropdown, DropdownDivider, DropdownItem, DropdownLabel } from '@/components/ui/Dropdown';

/**
 * Lets the owner move between "All shops" and a single branch. Shop accounts
 * never see this — their scope is fixed by their login, not by a control.
 */
export function ShopSwitcher({ className }: { className?: string }): JSX.Element | null {
  const { shopId, shops, setShopId, canSwitch, shop } = useShopScope();

  if (!canSwitch) return null;

  return (
    <Dropdown
      align="start"
      className={className}
      panelClassName="min-w-[16rem]"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-xl border border-line bg-surface px-2.5 text-sm transition-colors hover:border-subtle',
            'sm:w-auto sm:min-w-[11rem]',
          )}
        >
          <Store className="h-4 w-4 shrink-0 text-brand" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-left font-medium text-ink">
            {shop ? shop.name : 'All shops'}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
        </button>
      )}
    >
      {(close) => (
        <>
          <DropdownLabel>Viewing</DropdownLabel>

          <DropdownItem
            icon={shopId === null ? <Check /> : <span className="block h-4 w-4" />}
            onClick={() => {
              setShopId(null);
              close();
            }}
          >
            All shops
          </DropdownItem>

          <DropdownDivider />
          <DropdownLabel>Branches</DropdownLabel>

          {shops.map((option) => (
            <DropdownItem
              key={option.id}
              icon={shopId === option.id ? <Check /> : <span className="block h-4 w-4" />}
              onClick={() => {
                setShopId(option.id);
                close();
              }}
            >
              <span className="flex items-center gap-2">
                <span className="truncate">{option.name}</span>
                {!option.active && <span className="text-[11px] text-subtle">(inactive)</span>}
              </span>
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  );
}
