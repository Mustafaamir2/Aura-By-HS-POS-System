import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Tailwind's breakpoints, so JS and CSS agree on what "mobile" means. */
export const useIsMobile = (): boolean => useMediaQuery('(max-width: 767px)');
export const useIsTablet = (): boolean => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 1024px)');
