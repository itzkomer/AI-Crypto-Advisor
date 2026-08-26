/**
 * Shows whether a section is live, cached or a curated fallback.
 * Being explicit here is a deliberate UX choice: silently serving stale or
 * synthetic market data as "live" would be misleading.
 */
import clsx from 'clsx';
import { Database, Radio, ShieldAlert } from 'lucide-react';
import type { DataSource } from '@/types/api';

const CONFIG: Record<DataSource, { label: string; className: string; icon: typeof Radio }> = {
  live: {
    label: 'Live',
    className: 'border-bull/30 bg-bull/10 text-emerald-300',
    icon: Radio,
  },
  cache: {
    label: 'Cached',
    className: 'border-brand-500/30 bg-brand-500/10 text-brand-300',
    icon: Database,
  },
  fallback: {
    label: 'Fallback',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    icon: ShieldAlert,
  },
};

export const SourceBadge = ({ source, title }: { source: DataSource; title?: string }) => {
  const { label, className, icon: Icon } = CONFIG[source];
  return (
    <span
      title={title ?? `Data source: ${label.toLowerCase()}`}
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden="true" />
      {label}
    </span>
  );
};
