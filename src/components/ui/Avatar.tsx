import { cn } from '@/utils/cn';
import { initials } from '@/utils/text';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

/** Six muted tints, chosen by name so a person keeps the same colour. */
const TINTS = [
  'bg-brand-soft text-brand',
  'bg-info-soft text-info',
  'bg-ok-soft text-ok',
  'bg-warn-soft text-warn',
  'bg-accent-soft text-accent',
  'bg-danger-soft text-danger',
];

function tintFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length]!;
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps): JSX.Element {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn('shrink-0 rounded-full object-cover', SIZES[size], className)}
      />
    );
  }

  return (
    <span
      // Decorative: the name is always rendered beside it.
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        SIZES[size],
        tintFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
