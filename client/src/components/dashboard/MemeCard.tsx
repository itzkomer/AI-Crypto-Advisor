/** Section D - the daily crypto meme. */
import { useEffect, useState } from 'react';
import { ExternalLink, ImageOff, Laugh, Shuffle } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { FeedbackWidget } from './FeedbackWidget';
import { Button } from '@/components/ui/Button';
import { MemeSkeleton } from '@/components/ui/Skeleton';
import { useMeme, useShuffleMeme } from '@/hooks/useDashboard';
import { errorMessage } from '@/lib/apiClient';

export const MemeCard = () => {
  const { data, isLoading, isFetching, error, refetch } = useMeme();
  const shuffle = useShuffleMeme();

  // Reddit-hosted images sometimes 404; track that per meme so shuffling clears it.
  const [imageFailed, setImageFailed] = useState(false);
  const currentId = data?.data.memeId;
  useEffect(() => {
    setImageFailed(false);
  }, [currentId]);

  return (
    <SectionCard
      title="Crypto Meme"
      subtitle={data ? `r/${data.data.subreddit}` : 'Because charts are stressful'}
      icon={Laugh}
      accent="bull"
      source={data?.source}
      notice={data?.notice}
      isLoading={isLoading}
      isRefreshing={(isFetching && !isLoading) || shuffle.isPending}
      error={error}
      errorMessage={error ? errorMessage(error) : undefined}
      onRetry={() => void refetch()}
      skeleton={<MemeSkeleton />}
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => shuffle.mutate()}
          disabled={shuffle.isPending || isFetching}
          leftIcon={<Shuffle className="h-3.5 w-3.5" />}
          title="Show another meme"
        >
          <span className="hidden sm:inline">Shuffle</span>
        </Button>
      }
      footer={
        data ? (
          <FeedbackWidget
            sectionType="MEME"
            itemIdentifier={data.itemIdentifier}
            context={{
              memeId: data.data.memeId,
              title: data.data.title,
              subreddit: data.data.subreddit,
              imageUrl: data.data.imageUrl,
            }}
            label="Funny?"
          />
        ) : null
      }
    >
      {data ? (
        <>
          {shuffle.isError ? (
            <p className="text-xs text-bear">{errorMessage(shuffle.error)}</p>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-surface-950/60">
            {imageFailed ? (
              <div className="flex h-52 flex-col items-center justify-center gap-2 text-ink-500">
                <ImageOff className="h-6 w-6" aria-hidden="true" />
                <p className="text-xs">This image did not load. Try shuffling.</p>
              </div>
            ) : (
              <img
                src={data.data.imageUrl}
                alt={data.data.title}
                loading="lazy"
                onError={() => setImageFailed(true)}
                className="mx-auto max-h-72 w-full object-contain"
              />
            )}
          </div>

          <div className="flex items-start justify-between gap-3">
            <p className="text-balance text-sm leading-snug text-ink-300">{data.data.title}</p>
            {data.data.postUrl ? (
              <a
                href={data.data.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link shrink-0 text-xs"
                title="Open the original post"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">Open original post</span>
              </a>
            ) : null}
          </div>
        </>
      ) : null}
    </SectionCard>
  );
};
