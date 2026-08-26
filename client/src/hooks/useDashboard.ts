/**
 * One query per dashboard section.
 *
 * Independent queries (rather than one aggregate call) mean each card shows its
 * own skeleton, its own error state, and can refetch alone - a rate-limited news
 * provider never blanks the price card.
 */
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import type {
  InsightSection,
  MemeSection,
  NewsSection,
  OnboardingOptionsResponse,
  PricesSection,
  ProfileResponse,
  UserProfile,
} from '@/types/api';

export const queryKeys = {
  profile: ['profile'] as const,
  onboardingOptions: ['profile', 'options'] as const,
  prices: ['dashboard', 'prices'] as const,
  news: ['dashboard', 'news'] as const,
  insight: ['dashboard', 'insight'] as const,
  meme: ['dashboard', 'meme'] as const,
  feedback: ['feedback'] as const,
};

/* --------------------------- Profile --------------------------- */

export const useProfile = (): UseQueryResult<UserProfile | null> =>
  useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const response = await apiRequest<ProfileResponse>('/api/profile');
      return response.profile;
    },
    staleTime: 5 * 60 * 1000,
  });

export const useOnboardingOptions = (): UseQueryResult<OnboardingOptionsResponse> =>
  useQuery({
    queryKey: queryKeys.onboardingOptions,
    queryFn: () => apiRequest<OnboardingOptionsResponse>('/api/profile/options'),
    // The option catalog is effectively static for a deployment.
    staleTime: Infinity,
  });

export const useSaveProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      assets: UserProfile['assets'];
      archetype: UserProfile['archetype'];
      contentTypes: UserProfile['contentTypes'];
      goal: string | null;
    }) => {
      const response = await apiRequest<ProfileResponse>('/api/profile', {
        method: 'PUT',
        body: input,
      });
      return response.profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      // Preferences changed => every personalized section is stale.
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

/* --------------------------- Sections --------------------------- */

/** Prices move constantly; refetch on an interval and when the tab refocuses. */
export const usePrices = (): UseQueryResult<PricesSection> =>
  useQuery({
    queryKey: queryKeys.prices,
    queryFn: () => apiRequest<PricesSection>('/api/dashboard/prices'),
    staleTime: 45 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useNews = (): UseQueryResult<NewsSection> =>
  useQuery({
    queryKey: queryKeys.news,
    queryFn: () => apiRequest<NewsSection>('/api/dashboard/news'),
    staleTime: 5 * 60 * 1000,
  });

/** The insight is generated once per UTC day, so it does not need refetching. */
export const useInsight = (): UseQueryResult<InsightSection> =>
  useQuery({
    queryKey: queryKeys.insight,
    queryFn: () => apiRequest<InsightSection>('/api/dashboard/insight'),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useRegenerateInsight = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest<InsightSection>('/api/dashboard/insight', { query: { refresh: 'true' } }),
    onSuccess: (section) => {
      queryClient.setQueryData(queryKeys.insight, section);
    },
  });
};

export const useMeme = (): UseQueryResult<MemeSection> =>
  useQuery({
    queryKey: queryKeys.meme,
    queryFn: () => apiRequest<MemeSection>('/api/dashboard/meme'),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useShuffleMeme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiRequest<MemeSection>('/api/dashboard/meme', { query: { shuffle: 'true' } }),
    onSuccess: (section) => {
      queryClient.setQueryData(queryKeys.meme, section);
    },
  });
};
