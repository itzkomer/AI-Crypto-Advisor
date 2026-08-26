/**
 * The personalized dashboard: a responsive 2x2 grid of the four sections, each
 * loading and failing independently.
 */
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PricesCard } from '@/components/dashboard/PricesCard';
import { NewsCard } from '@/components/dashboard/NewsCard';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { MemeCard } from '@/components/dashboard/MemeCard';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useDashboard';
import { ARCHETYPE_LABELS, CONTENT_TYPE_LABELS } from '@/lib/labels';

const greeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-100">
            {greeting()}, {firstName}
          </h1>

          {profile ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="chip border-brand-500/25 bg-brand-500/10 text-brand-300">
                {ARCHETYPE_LABELS[profile.archetype].label}
              </span>
              {profile.assets.map((symbol) => (
                <span key={symbol} className="chip font-mono">
                  {symbol}
                </span>
              ))}
              {profile.contentTypes.map((contentType) => (
                <span key={contentType} className="chip">
                  {CONTENT_TYPE_LABELS[contentType]}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-ink-500">Your personalized market briefing.</p>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          onClick={() => navigate('/onboarding')}
        >
          Edit preferences
        </Button>
      </div>

      {/* 1 column on mobile, 2 from `lg` up. Cards stretch to equal height per row. */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 lg:gap-5">
        <PricesCard />
        <InsightCard />
        <NewsCard />
        <MemeCard />
      </div>
    </AppShell>
  );
};
