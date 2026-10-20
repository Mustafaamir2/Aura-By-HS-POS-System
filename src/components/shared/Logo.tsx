import { cn } from '@/utils/cn';
import { useTable } from '@/hooks/useDb';

export interface LogoProps {
  className?: string;
  /** Hide the wordmark, e.g. in a collapsed sidebar. */
  markOnly?: boolean;
  size?: 'sm' | 'md';
}

/** The business identity, read live from settings so a rename shows everywhere. */
export function Logo({ className, markOnly, size = 'md' }: LogoProps): JSX.Element {
  const settings = useTable('settings');
  const { name, tagline, logoUrl } = settings.business;

  const box = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';

  const mark = logoUrl ? (
    <img
      src={logoUrl}
      alt=""
      width={36}
      height={36}
      className={cn(
        // The mark is gold on near-black maroon, so it needs a hairline to
        // separate it from a white card and a glow to lift it in dark mode.
        'shrink-0 rounded-xl object-cover ring-1 ring-accent/30 shadow-sm',
        box,
      )}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-xl bg-brand font-display font-semibold text-brand-ink',
        box,
        size === 'sm' ? 'text-sm' : 'text-base',
      )}
    >
      {name.trim().charAt(0) || 'A'}
    </span>
  );

  if (markOnly) return <span className={className}>{mark}</span>;

  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {mark}
      <span className="min-w-0">
        <span className="block truncate font-display text-[15px] font-semibold leading-tight text-ink">
          {name}
        </span>
        {tagline && <span className="block truncate text-[11px] text-subtle">{tagline}</span>}
      </span>
    </span>
  );
}
