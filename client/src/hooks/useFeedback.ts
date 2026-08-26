/**
 * Feedback state for all four widgets.
 *
 * One `GET /api/feedback` hydrates every widget. Votes are applied optimistically
 * (a thumb must feel instant) and rolled back if the request fails.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { queryKeys } from '@/hooks/useDashboard';
import type {
  FeedbackListResponse,
  FeedbackMutationResponse,
  FeedbackRecord,
  SectionType,
  Vote,
} from '@/types/api';

export interface VoteInput {
  sectionType: SectionType;
  itemIdentifier: string;
  vote: Vote;
  /** Snapshot of the rated content, stored server-side for later training use. */
  context?: unknown;
}

const matches = (record: FeedbackRecord, sectionType: SectionType, itemIdentifier: string) =>
  record.sectionType === sectionType && record.itemIdentifier === itemIdentifier;

export const useFeedback = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.feedback,
    queryFn: async () => {
      const response = await apiRequest<FeedbackListResponse>('/api/feedback');
      return response.feedback;
    },
    staleTime: 60 * 1000,
  });

  const records = query.data ?? [];

  /** Current vote for a section/item, or null. */
  const getVote = useCallback(
    (sectionType: SectionType, itemIdentifier: string): Vote | null =>
      records.find((record) => matches(record, sectionType, itemIdentifier))?.vote ?? null,
    [records],
  );

  const submit = useMutation({
    mutationFn: async (input: VoteInput) => {
      const response = await apiRequest<FeedbackMutationResponse>('/api/feedback', {
        method: 'POST',
        body: input,
      });
      return response.feedback;
    },
    onMutate: async (input: VoteInput) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.feedback });
      const previous = queryClient.getQueryData<FeedbackRecord[]>(queryKeys.feedback) ?? [];

      const now = new Date().toISOString();
      const optimistic: FeedbackRecord = {
        id: `optimistic-${input.sectionType}-${input.itemIdentifier}`,
        sectionType: input.sectionType,
        itemIdentifier: input.itemIdentifier,
        vote: input.vote,
        createdAt: now,
        updatedAt: now,
      };

      queryClient.setQueryData<FeedbackRecord[]>(queryKeys.feedback, [
        optimistic,
        ...previous.filter(
          (record) => !matches(record, input.sectionType, input.itemIdentifier),
        ),
      ]);

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.feedback, context.previous);
      }
    },
    onSuccess: (record) => {
      // Swap the optimistic row for the persisted one (real id/timestamps).
      queryClient.setQueryData<FeedbackRecord[]>(queryKeys.feedback, (current) => [
        record,
        ...(current ?? []).filter(
          (existing) => !matches(existing, record.sectionType, record.itemIdentifier),
        ),
      ]);
    },
  });

  const clear = useMutation({
    mutationFn: async (input: { sectionType: SectionType; itemIdentifier: string }) => {
      await apiRequest<void>('/api/feedback', { method: 'DELETE', body: input });
      return input;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.feedback });
      const previous = queryClient.getQueryData<FeedbackRecord[]>(queryKeys.feedback) ?? [];
      queryClient.setQueryData<FeedbackRecord[]>(
        queryKeys.feedback,
        previous.filter((record) => !matches(record, input.sectionType, input.itemIdentifier)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.feedback, context.previous);
      }
    },
  });

  /**
   * Clicking the active thumb clears the vote; clicking the other one switches.
   * Returns a promise so callers can await the settled state if they need to.
   */
  const vote = useCallback(
    async (input: VoteInput): Promise<void> => {
      const current = getVote(input.sectionType, input.itemIdentifier);
      if (current === input.vote) {
        await clear.mutateAsync({
          sectionType: input.sectionType,
          itemIdentifier: input.itemIdentifier,
        });
        return;
      }
      await submit.mutateAsync(input);
    },
    [clear, getVote, submit],
  );

  return {
    records,
    isLoading: query.isLoading,
    getVote,
    vote,
    isSubmitting: submit.isPending || clear.isPending,
    error: submit.error ?? clear.error ?? null,
  };
};
