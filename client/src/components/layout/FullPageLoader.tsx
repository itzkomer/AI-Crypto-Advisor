import { Loader2 } from 'lucide-react';

export const FullPageLoader = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="grid min-h-screen place-items-center" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-brand-400" aria-hidden="true" />
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  </div>
);
