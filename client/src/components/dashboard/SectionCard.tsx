/**
 * Shared shell for the four dashboard sections.
 *
 * Owns the whole state machine (loading -> error -> content) so each card only
 * has to render its own happy path, and so all four degrade identically.
 */
import type { ComponentType, ReactNode } from 'react';
import clsx from 'clsx';
import { RefreshCw } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { SourceBadge } from '@/components/ui/SourceBadge';
import type { DataSource } from '@/types/api';

export interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon: ComponentType<{ className?: string }>;
  /** Accent used for the icon tile, so cards are distinguishable at a glance. */
  accent?: 'brand' | 'accent' | 'bull' | 'amber';
  source?: DataSource | undefined;
  notice?: string | null | undefined;
  isLoading: boolean;
  isRefreshing?: boolean;
  error?: unknown;
  errorMessage?: string;
  onRetry?: () => void;
  /** Extra header controls (shuffle, regenerate). */
  actions?: ReactNode;
  /** Rendered while `isLoading` is true. */
  skeleton: ReactNode;
  /** Pinned to the bottom of the card - the feedback widget lives here. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

const ACCENTS: Record<NonNullable<SectionCardProps['accent']>, string> = {
  brand: 'bg-brand-500/12 text-brand-400 ring-brand-500/25',
  accent: 'bg-accent-500/12 text-accent-400 ring-accent-500/25',
  bull: 'bg-bull/12 text-bull ring-bull/25',
  amber: 'bg-amber-500/12 text-amber-400 ring-amber-500/25',
};

export const SectionCard = ({
  title,
  subtitle,
  icon: Icon,
  accent = 'brand',
  source,
  notice,
  isLoading,
  isRefreshing = false,
  error,
  errorMessage: errorText,
  onRetry,
  actions,
  skeleton,
  footer,
  children,
  className,
}: SectionCardProps) => (
  <section
    aria-label={title}
    aria-busy={isLoading}
    className={clsx('panel flex animate-fade-in-up flex-col overflow-hidden', className)}
  >
    <header className="flex items-start gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
      <span
        className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1', ACCENTS[accent])}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-ink-100">{title}</h2>
          {source && !isLoading && !error ? <SourceBadge source={source} /> : null}
          {isRefreshing ? (
            <RefreshCw className="h-3 w-3 animate-spin text-ink-500" aria-label="Refreshing" />
          ) : null}
        </div>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-ink-500">{subtitle}</p> : null}
      </div>

      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </header>

    <div className="flex-1 px-4 py-4 sm:px-5">
      {isLoading ? (
        skeleton
      ) : error ? (
        <Alert
          tone="error"
          action={
            onRetry ? (
              <Button variant="ghost" size="sm" onClick={onRetry} className="shrink-0">
                Retry
              </Button>
            ) : undefined
          }
        >
          {errorText ?? 'Could not load this section.'}
        </Alert>
      ) : (
        <div className="space-y-3">
          {notice ? (
            <Alert tone="warning" className="mb-1">
              {notice}
            </Alert>
          ) : null}
          {children}
        </div>
      )}
    </div>

    {footer && !isLoading && !error ? (
      <footer className="border-t border-white/[0.06] px-4 py-2.5 sm:px-5">{footer}</footer>
    ) : null}
  </section>
);
