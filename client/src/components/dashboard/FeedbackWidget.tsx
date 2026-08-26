/**
 * Thumbs up / thumbs down for one dashboard section.
 *
 * Behaviour: click a thumb to vote, click the active thumb again to clear it.
 * Votes persist to `Feedback(userId, sectionType, itemIdentifier, vote)` and are
 * applied optimistically, so the UI never waits on the network.
 */
import { useState } from 'react';
import clsx from 'clsx';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useFeedback } from '@/hooks/useFeedback';
import { errorMessage } from '@/lib/apiClient';
import type { SectionType, Vote } from '@/types/api';

export interface FeedbackWidgetProps {
  sectionType: SectionType;
  /** Stable id of the exact content shown, from the section envelope. */
  itemIdentifier: string;
  /**
   * Snapshot of the rated content, persisted server-side. This is what turns a
   * bare thumb into a usable training label later.
   */
  context?: unknown;
  label?: string;
}

export const FeedbackWidget = ({
  sectionType,
  itemIdentifier,
  context,
  label = 'Was this useful?',
}: FeedbackWidgetProps) => {
  const { getVote, vote, isSubmitting } = useFeedback();
  const [localError, setLocalError] = useState<string | null>(null);

  const current = getVote(sectionType, itemIdentifier);

  const handleVote = async (nextVote: Vote): Promise<void> => {
    setLocalError(null);
    try {
      await vote({ sectionType, itemIdentifier, vote: nextVote, context });
    } catch (error) {
      setLocalError(errorMessage(error));
    }
  };

  const buttonClass = (target: Vote): string =>
    clsx(
      'inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all duration-150',
      'disabled:cursor-not-allowed disabled:opacity-60',
      current === target
        ? target === 'UP'
          ? 'border-bull/40 bg-bull/15 text-bull'
          : 'border-bear/40 bg-bear/15 text-bear'
        : 'border-white/10 bg-white/[0.03] text-ink-500 hover:border-white/20 hover:text-ink-300',
    );

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink-500">
        {localError ? <span className="text-bear">{localError}</span> : current ? 'Thanks — noted.' : label}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void handleVote('UP')}
          disabled={isSubmitting}
          aria-pressed={current === 'UP'}
          aria-label={current === 'UP' ? 'Remove positive feedback' : 'Mark as useful'}
          title="Useful"
          className={buttonClass('UP')}
        >
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => void handleVote('DOWN')}
          disabled={isSubmitting}
          aria-pressed={current === 'DOWN'}
          aria-label={current === 'DOWN' ? 'Remove negative feedback' : 'Mark as not useful'}
          title="Not useful"
          className={buttonClass('DOWN')}
        >
          <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
