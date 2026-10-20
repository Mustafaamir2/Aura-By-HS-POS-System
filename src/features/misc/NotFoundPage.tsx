import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { homeFor } from '@/app/navigation';

export function NotFoundPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const home = user ? homeFor(user.role) : '/login';

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6">
      <div className="max-w-sm text-center">
        <span
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"
          aria-hidden
        >
          <Compass className="h-6 w-6" />
        </span>

        <p className="font-display text-3xl font-semibold text-ink">Page not found</p>
        <p className="mt-2 text-sm text-muted">
          That link does not lead anywhere in the salon suite. It may have been moved, or it may
          belong to a part of the app your account cannot open.
        </p>

        <Link
          to={home}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-strong"
        >
          Back to your dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
