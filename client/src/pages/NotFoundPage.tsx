import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { CenteredShell } from '@/components/layout/AppShell';

export const NotFoundPage = () => (
  <CenteredShell>
    <div className="panel flex flex-col items-center gap-4 p-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/[0.06]">
        <Compass className="h-6 w-6 text-ink-400" aria-hidden="true" />
      </span>
      <div>
        <h1 className="text-xl font-semibold text-ink-100">Page not found</h1>
        <p className="mt-1 text-sm text-ink-500">
          That route does not exist. Let's get you back to your dashboard.
        </p>
      </div>
      <Link to="/dashboard" className="link text-sm font-medium">
        Go to dashboard
      </Link>
    </div>
  </CenteredShell>
);
