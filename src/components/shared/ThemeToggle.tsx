import { Moon, Sun } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

/** One-tap light/dark switch, kept in the top bar rather than behind a menu. */
export function ThemeToggle({ className }: { className?: string }): JSX.Element {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        'relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-line/60 hover:text-ink',
        className,
      )}
    >
      {/* Both icons stay mounted and cross-fade, so the button never jumps. */}
      <Sun
        className={cn(
          'absolute h-[18px] w-[18px] transition-all duration-200',
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0',
        )}
        aria-hidden
      />
      <Moon
        className={cn(
          'absolute h-[18px] w-[18px] transition-all duration-200',
          isDark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100',
        )}
        aria-hidden
      />
    </button>
  );
}
