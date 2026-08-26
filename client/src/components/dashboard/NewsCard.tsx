/** Section B - market news tailored to the user's assets. */
import { ArrowUpRight, Newspaper, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { SectionCard } from './SectionCard';
import { FeedbackWidget } from './FeedbackWidget';
import { Button } from '@/components/ui/Button';
import { NewsSkeleton } from '@/components/ui/Skeleton';
import { useNews } from '@/hooks/useDashboard';
import { errorMessage } from '@/lib/apiClient';
import { formatRelativeTime } from '@/lib/format';
import type { NewsArticle } from '@/types/api';

const SENTIMENT_STYLES: Record<NewsArticle['sentiment'], string> = {
  positive: 'bg-bull/12 text-bull border-bull/25',
  negative: 'bg-bear/12 text-bear border-bear/25',
  neutral: 'bg-white/[0.05] text-ink-400 border-white/10',
};

const ArticleRow = ({ article }: { article: NewsArticle }) => (
  <li className="group border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md p-1 -m-1 transition-colors hover:bg-white/[0.03]"
    >
      <p className="flex items-start gap-1.5 text-sm font-medium leading-snug text-ink-100 group-hover:text-brand-300">
        <span className="text-balance">{article.title}</span>
        <ArrowUpRight
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500 transition-colors group-hover:text-brand-400"
          aria-hidden="true"
        />
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
        <span className="truncate font-medium text-ink-400">{article.source}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={article.publishedAt}>{formatRelativeTime(article.publishedAt)}</time>

        <span
          className={clsx(
            'ml-auto rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            SENTIMENT_STYLES[article.sentiment],
          )}
        >
          {article.sentiment}
        </span>

        {article.currencies.slice(0, 3).map((code) => (
          <span key={code} className="chip px-1.5 py-0 text-[10px]">
            {code}
          </span>
        ))}
      </div>
    </a>
  </li>
);

export const NewsCard = () => {
  const { data, isLoading, isFetching, error, refetch } = useNews();

  return (
    <SectionCard
      title="Market News"
      subtitle="Filtered to the assets you follow"
      icon={Newspaper}
      accent="accent"
      source={data?.source}
      notice={data?.notice}
      isLoading={isLoading}
      isRefreshing={isFetching && !isLoading}
      error={error}
      errorMessage={error ? errorMessage(error) : undefined}
      onRetry={() => void refetch()}
      skeleton={<NewsSkeleton />}
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Refresh news"
          title="Refresh news"
          className="px-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      }
      footer={
        data ? (
          <FeedbackWidget
            sectionType="NEWS"
            itemIdentifier={data.itemIdentifier}
            context={{
              source: data.source,
              generatedAt: data.generatedAt,
              headlines: data.data.articles.map((article) => ({
                id: article.id,
                title: article.title,
                source: article.source,
              })),
            }}
            label="Were these headlines relevant?"
          />
        ) : null
      }
    >
      {data ? (
        data.data.articles.length > 0 ? (
          <ul className="space-y-3">
            {data.data.articles.map((article) => (
              <ArticleRow key={article.id} article={article} />
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-ink-500">
            No stories matched your assets right now.
          </p>
        )
      ) : null}
    </SectionCard>
  );
};
