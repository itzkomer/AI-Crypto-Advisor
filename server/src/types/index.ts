/**
 * Single source of truth for every API payload the client can observe.
 *
 * `client/src/types/api.ts` mirrors this file verbatim. When you change a
 * contract here, update the client copy in the same commit.
 */

/* ------------------------------------------------------------------ */
/* Domain enums (string unions - portable across SQLite and Postgres) */
/* ------------------------------------------------------------------ */

export const ASSET_SYMBOLS = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'AVAX', 'MATIC'] as const;
export type AssetSymbol = (typeof ASSET_SYMBOLS)[number];

export const INVESTOR_ARCHETYPES = ['HODLER', 'DAY_TRADER', 'NFT_COLLECTOR', 'DEFI_ENTHUSIAST'] as const;
export type InvestorArchetype = (typeof INVESTOR_ARCHETYPES)[number];

export const CONTENT_TYPES = ['MARKET_NEWS', 'CHARTS', 'SOCIAL_SENTIMENT', 'FUN_MEMES'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const SECTION_TYPES = ['PRICES', 'NEWS', 'INSIGHT', 'MEME'] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const VOTES = ['UP', 'DOWN'] as const;
export type Vote = (typeof VOTES)[number];

/* ------------------------------------------------------------------ */
/* Auth + profile                                                      */
/* ------------------------------------------------------------------ */

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  /** False until onboarding has been submitted at least once. */
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

/** JWT payload we sign. Kept minimal on purpose. */
export interface JwtPayload {
  sub: string;
  email: string;
}

/* ------------------------------------------------------------------ */
/* Dashboard section envelope                                          */
/* ------------------------------------------------------------------ */

/**
 * Where a section's data came from. The client surfaces this so a user can tell
 * live data from a cached or curated fallback instead of being quietly lied to.
 */
export type DataSource = 'live' | 'cache' | 'fallback';

/**
 * Every dashboard endpoint returns this envelope. `itemIdentifier` is the
 * stable id the feedback widget votes on.
 */
export interface SectionEnvelope<TData> {
  sectionType: SectionType;
  itemIdentifier: string;
  source: DataSource;
  generatedAt: string;
  /** Human-readable reason the section degraded, when source !== 'live'. */
  notice: string | null;
  data: TData;
}

/* ------------------------------------------------------------------ */
/* Section payloads                                                    */
/* ------------------------------------------------------------------ */

export interface CoinPrice {
  id: string;
  symbol: AssetSymbol;
  name: string;
  image: string | null;
  priceUsd: number;
  change24hPercent: number;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  /** 7-day close series used for the sparkline; empty when unavailable. */
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
  /** Asset symbols CryptoPanic associated with the post. */
  currencies: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface NewsPayload {
  articles: NewsArticle[];
}

export interface InsightPayload {
  /** DailyInsight row id - also embedded in the envelope's itemIdentifier. */
  insightId: string;
  content: string;
  model: string;
  date: string;
  /** Short strings describing what the model was told, shown as chips in the UI. */
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

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Field-level validation details, keyed by dotted path. */
    details?: Record<string, string[]>;
  };
}
