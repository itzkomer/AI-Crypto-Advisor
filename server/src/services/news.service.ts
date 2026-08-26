/**
 * Market news - CryptoPanic free tier, filtered to the user's assets.
 *
 * Endpoint: GET /posts/?auth_token=...&currencies=BTC,ETH&public=true
 * No token configured (or a 4xx/429) degrades to the curated digest in
 * `data/fallbacks.ts`, still filtered by the user's assets so the section stays
 * personalized even when offline.
 */
import { env } from '../config/env';
import { fetchJson } from '../lib/httpClient';
import { withCache } from '../lib/cache';
import { logger } from '../lib/logger';
import { shortHash } from '../utils/hash';
import { utcDateKey } from '../utils/date';
import { ASSET_CATALOG } from '../data/assets';
import { FALLBACK_NEWS } from '../data/fallbacks';
import type { AssetSymbol, DataSource, NewsArticle, NewsPayload, NewsSection } from '../types';

const MAX_ARTICLES = 6;

interface CryptoPanicPost {
  id: number;
  title?: string;
  url?: string;
  published_at?: string;
  domain?: string;
  source?: { title?: string; domain?: string } | null;
  currencies?: Array<{ code?: string; title?: string }> | null;
  votes?: {
    positive?: number;
    negative?: number;
    important?: number;
  } | null;
}

interface CryptoPanicResponse {
  results?: CryptoPanicPost[];
}

const classifySentiment = (post: CryptoPanicPost): NewsArticle['sentiment'] => {
  const positive = post.votes?.positive ?? 0;
  const negative = post.votes?.negative ?? 0;
  if (positive > negative) return 'positive';
  if (negative > positive) return 'negative';
  return 'neutral';
};

const buildUrl = (symbols: AssetSymbol[], token: string): string => {
  const currencies = symbols.map((symbol) => ASSET_CATALOG[symbol].cryptoPanicCode).join(',');
  const params = new URLSearchParams({
    auth_token: token,
    public: 'true',
    kind: 'news',
  });
  if (currencies) params.set('currencies', currencies);
  return `${env.CRYPTOPANIC_API_BASE}/posts/?${params.toString()}`;
};

const mapPosts = (posts: CryptoPanicPost[]): NewsArticle[] =>
  posts
    .filter((post): post is CryptoPanicPost & { title: string } => Boolean(post.title))
    .slice(0, MAX_ARTICLES)
    .map((post) => ({
      id: String(post.id),
      title: post.title.trim(),
      url: post.url ?? '#',
      source: post.source?.title || post.source?.domain || post.domain || 'CryptoPanic',
      publishedAt: post.published_at ?? new Date().toISOString(),
      currencies: (post.currencies ?? [])
        .map((currency) => currency.code)
        .filter((code): code is string => Boolean(code)),
      sentiment: classifySentiment(post),
    }));

const fetchLiveNews = async (symbols: AssetSymbol[], token: string): Promise<NewsArticle[]> => {
  const response = await fetchJson<CryptoPanicResponse>(buildUrl(symbols, token), {
    provider: 'cryptopanic',
  });
  const articles = mapPosts(response.results ?? []);
  if (articles.length === 0) throw new Error('CryptoPanic returned no usable posts.');
  return articles;
};

/**
 * Curated digest, ranked so articles tagged with the user's assets come first
 * and generic macro items fill the remainder.
 */
const curatedNews = (symbols: AssetSymbol[]): NewsArticle[] => {
  const wanted = new Set<string>(symbols);
  const score = (article: NewsArticle): number =>
    article.currencies.filter((code) => wanted.has(code)).length;

  return [...FALLBACK_NEWS]
    .map((article) => ({ article, relevance: score(article) }))
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return Date.parse(b.article.publishedAt) - Date.parse(a.article.publishedAt);
    })
    .slice(0, MAX_ARTICLES)
    .map((entry) => entry.article);
};

const buildItemIdentifier = (articles: NewsArticle[]): string =>
  `news:${utcDateKey()}:${shortHash(articles.map((article) => article.id).join('|'))}`;

export const getNewsSection = async (symbols: AssetSymbol[]): Promise<NewsSection> => {
  const assets = symbols.length > 0 ? symbols : (['BTC', 'ETH'] as AssetSymbol[]);
  const token = env.CRYPTOPANIC_API_TOKEN;

  let articles: NewsArticle[];
  let source: DataSource = 'live';
  let notice: string | null = null;

  if (!token) {
    articles = curatedNews(assets);
    source = 'fallback';
    notice = 'CRYPTOPANIC_API_TOKEN is not set - showing a curated digest.';
  } else {
    try {
      const result = await withCache(
        `news:global:${[...assets].sort().join(',')}`,
        env.CACHE_TTL_NEWS_SECONDS,
        () => fetchLiveNews(assets, token),
      );
      articles = result.value;
      source = result.resolution === 'live' ? 'live' : 'cache';
      if (result.resolution === 'stale') {
        notice = 'CryptoPanic is unavailable - showing the last successful headlines.';
      }
    } catch (error) {
      logger.warn('News fell back to curated digest', { error: String(error) });
      articles = curatedNews(assets);
      source = 'fallback';
      notice = 'News provider is rate-limited - showing a curated digest.';
    }
  }

  const payload: NewsPayload = { articles };

  return {
    sectionType: 'NEWS',
    itemIdentifier: buildItemIdentifier(articles),
    source,
    generatedAt: new Date().toISOString(),
    notice,
    data: payload,
  };
};

/** Exposed so the insight prompt can reuse headlines without a second fetch. */
export const getHeadlinesForPrompt = async (symbols: AssetSymbol[]): Promise<NewsArticle[]> => {
  const section = await getNewsSection(symbols);
  return section.data.articles.slice(0, 4);
};
