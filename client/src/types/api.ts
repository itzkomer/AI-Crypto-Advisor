/**
 * API contract types.
 *
 * MIRRORS `server/src/types/index.ts` - keep the two in sync in the same commit.
 * They are duplicated rather than shared through a workspace package to keep the
 * Vite and tsc builds independent (no project references, no build ordering).
 */

export const ASSET_SYMBOLS = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'AVAX', 'MATIC'] as const;
export type AssetSymbol = (typeof ASSET_SYMBOLS)[number];

export const INVESTOR_ARCHETYPES = [
  'HODLER',
  'DAY_TRADER',
  'NFT_COLLECTOR',
  'DEFI_ENTHUSIAST',
] as const;
export type InvestorArchetype = (typeof INVESTOR_ARCHETYPES)[number];

export const CONTENT_TYPES = ['MARKET_NEWS', 'CHARTS', 'SOCIAL_SENTIMENT', 'FUN_MEMES'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const SECTION_TYPES = ['PRICES', 'NEWS', 'INSIGHT', 'MEME'] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export type Vote = 'UP' | 'DOWN';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  hasCompletedOnboarding: boolean;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export interface UserProfile {
  assets: AssetSymbol[];
  archetype: InvestorArchetype;
  contentTypes: ContentType[];
  goal: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export type DataSource = 'live' | 'cache' | 'fallback';

export interface SectionEnvelope<TData> {
  sectionType: SectionType;
  itemIdentifier: string;
  source: DataSource;
  generatedAt: string;
  notice: string | null;
  data: TData;
}

export interface CoinPrice {
  id: string;
  symbol: AssetSymbol;
  name: string;
  image: string | null;
  priceUsd: number;
  change24hPercent: number;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  sparkline: number[];
}

export interface PricesPayload {
  coins: CoinPrice[];
  currency: 'usd';
}

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  currencies: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface NewsPayload {
  articles: NewsArticle[];
}

export interface InsightPayload {
  insightId: string;
  content: string;
  model: string;
  date: string;
  basedOn: string[];
}

export interface MemePayload {
  memeId: string;
  title: string;
  imageUrl: string;
  postUrl: string | null;
  subreddit: string;
  author: string | null;
}

export type PricesSection = SectionEnvelope<PricesPayload>;
export type NewsSection = SectionEnvelope<NewsPayload>;
export type InsightSection = SectionEnvelope<InsightPayload>;
export type MemeSection = SectionEnvelope<MemePayload>;

export interface FeedbackRecord {
  id: string;
  sectionType: SectionType;
  itemIdentifier: string;
  vote: Vote;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSummary {
  sectionType: SectionType;
  up: number;
  down: number;
}

/* ---------------- Response wrappers ---------------- */

export interface MeResponse {
  user: PublicUser;
}

export interface ProfileResponse {
  profile: UserProfile | null;
}

export interface FeedbackListResponse {
  feedback: FeedbackRecord[];
}

export interface FeedbackMutationResponse {
  feedback: FeedbackRecord;
}

export interface OnboardingOption<TValue extends string> {
  value: TValue;
  label: string;
  description?: string;
  symbol?: string;
}

export interface OnboardingOptionsResponse {
  assets: OnboardingOption<AssetSymbol>[];
  archetypes: OnboardingOption<InvestorArchetype>[];
  contentTypes: OnboardingOption<ContentType>[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
