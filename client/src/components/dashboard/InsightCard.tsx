/** Section C - the daily AI insight, generated from the user's profile + market data. */
import { Sparkles, Wand2 } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { FeedbackWidget } from './FeedbackWidget';
import { Button } from '@/components/ui/Button';
import { InsightSkeleton } from '@/components/ui/Skeleton';
import { useInsight, useRegenerateInsight } from '@/hooks/useDashboard';
import { errorMessage } from '@/lib/apiClient';
import { formatDate } from '@/lib/format';

/** "mistralai/mistral-7b-instruct:free" -> "mistral-7b-instruct" */
const prettyModel = (model: string): string => {
  if (model.startsWith('fallback:')) return 'local template';
  const withoutOwner = model.includes('/') ? (model.split('/').pop() ?? model) : model;
  return withoutOwner.replace(/:free$/, '');
};

export const InsightCard = () => {
  const { data, isLoading, isFetching, error, refetch } = useInsight();
  const regenerate = useRegenerateInsight();

  return (
    <SectionCard
      title="Daily AI Insight"
      subtitle={data ? `${formatDate(data.data.date)} · ${prettyModel(data.data.model)}` : 'Personalized to your profile'}
      icon={Sparkles}
      accent="amber"
      source={data?.source}
      notice={data?.notice}
      isLoading={isLoading}
      isRefreshing={(isFetching && !isLoading) || regenerate.isPending}
      error={error}
      errorMessage={error ? errorMessage(error) : undefined}
      onRetry={() => void refetch()}
      skeleton={<InsightSkeleton />}
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending || isFetching}
          leftIcon={<Wand2 className="h-3.5 w-3.5" />}
          title="Generate a fresh insight"
        >
          <span className="hidden sm:inline">Regenerate</span>
        </Button>
      }
      footer={
        data ? (
          <FeedbackWidget
            sectionType="INSIGHT"
            itemIdentifier={data.itemIdentifier}
            context={{
              insightId: data.data.insightId,
              model: data.data.model,
              date: data.data.date,
              content: data.data.content,
            }}
            label="Did this insight land?"
          />
        ) : null
      }
    >
      {data ? (
        <>
          {regenerate.isError ? (
            <p className="text-xs text-bear">{errorMessage(regenerate.error)}</p>
          ) : null}

          <blockquote className="border-l-2 border-amber-500/40 pl-3.5">
            <p className="text-balance text-[15px] leading-relaxed text-ink-100">
              {data.data.content}
            </p>
          </blockquote>

          {data.data.basedOn.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-xs text-ink-500">Based on</span>
              {data.data.basedOn.map((chip) => (
                <span key={chip} className="chip">
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          <p className="pt-1 text-[11px] leading-relaxed text-ink-500">
            AI-generated summary of public market data. Not financial advice.
          </p>
        </>
      ) : null}
    </SectionCard>
  );
};
