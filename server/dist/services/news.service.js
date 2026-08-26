"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHeadlinesForPrompt = exports.getNewsSection = void 0;
/**
 * Market news - CryptoPanic free tier, filtered to the user's assets.
 *
 * Endpoint: GET /posts/?auth_token=...&currencies=BTC,ETH&public=true
 * No token configured (or a 4xx/429) degrades to the curated digest in
 * `data/fallbacks.ts`, still filtered by the user's assets so the section stays
 * personalized even when offline.
 */
const env_1 = require("../config/env");
const httpClient_1 = require("../lib/httpClient");
const cache_1 = require("../lib/cache");
const logger_1 = require("../lib/logger");
const hash_1 = require("../utils/hash");
const date_1 = require("../utils/date");
const assets_1 = require("../data/assets");
const fallbacks_1 = require("../data/fallbacks");
const MAX_ARTICLES = 6;
const classifySentiment = (post) => {
    const positive = post.votes?.positive ?? 0;
    const negative = post.votes?.negative ?? 0;
    if (positive > negative)
        return 'positive';
    if (negative > positive)
        return 'negative';
    return 'neutral';
};
const buildUrl = (symbols, token) => {
    const currencies = symbols.map((symbol) => assets_1.ASSET_CATALOG[symbol].cryptoPanicCode).join(',');
    const params = new URLSearchParams({
        auth_token: token,
        public: 'true',
        kind: 'news',
    });
    if (currencies)
        params.set('currencies', currencies);
    return `${env_1.env.CRYPTOPANIC_API_BASE}/posts/?${params.toString()}`;
};
const mapPosts = (posts) => posts
    .filter((post) => Boolean(post.title))
    .slice(0, MAX_ARTICLES)
    .map((post) => ({
    id: String(post.id),
    title: post.title.trim(),
    url: post.url ?? '#',
    source: post.source?.title || post.source?.domain || post.domain || 'CryptoPanic',
    publishedAt: post.published_at ?? new Date().toISOString(),
    currencies: (post.currencies ?? [])
        .map((currency) => currency.code)
        .filter((code) => Boolean(code)),
    sentiment: classifySentiment(post),
}));
const fetchLiveNews = async (symbols, token) => {
    const response = await (0, httpClient_1.fetchJson)(buildUrl(symbols, token), {
        provider: 'cryptopanic',
    });
    const articles = mapPosts(response.results ?? []);
    if (articles.length === 0)
        throw new Error('CryptoPanic returned no usable posts.');
    return articles;
};
/**
 * Curated digest, ranked so articles tagged with the user's assets come first
 * and generic macro items fill the remainder.
 */
const curatedNews = (symbols) => {
    const wanted = new Set(symbols);
    const score = (article) => article.currencies.filter((code) => wanted.has(code)).length;
    return (0, fallbacks_1.fallbackNews)()
        .map((article) => ({ article, relevance: score(article) }))
        .sort((a, b) => {
        if (b.relevance !== a.relevance)
            return b.relevance - a.relevance;
        return Date.parse(b.article.publishedAt) - Date.parse(a.article.publishedAt);
    })
        .slice(0, MAX_ARTICLES)
        .map((entry) => entry.article);
};
const buildItemIdentifier = (articles) => `news:${(0, date_1.utcDateKey)()}:${(0, hash_1.shortHash)(articles.map((article) => article.id).join('|'))}`;
const getNewsSection = async (symbols) => {
    const assets = symbols.length > 0 ? symbols : ['BTC', 'ETH'];
    const token = env_1.env.CRYPTOPANIC_API_TOKEN;
    let articles;
    let source = 'live';
    let notice = null;
    if (!token) {
        articles = curatedNews(assets);
        source = 'fallback';
        notice = 'CRYPTOPANIC_API_TOKEN is not set - showing a curated digest.';
    }
    else {
        try {
            const result = await (0, cache_1.withCache)(`news:global:${[...assets].sort().join(',')}`, env_1.env.CACHE_TTL_NEWS_SECONDS, () => fetchLiveNews(assets, token));
            articles = result.value;
            source = result.resolution === 'live' ? 'live' : 'cache';
            if (result.resolution === 'stale') {
                notice = 'CryptoPanic is unavailable - showing the last successful headlines.';
            }
        }
        catch (error) {
            logger_1.logger.warn('News fell back to curated digest', { error: String(error) });
            articles = curatedNews(assets);
            source = 'fallback';
            notice = 'News provider is rate-limited - showing a curated digest.';
        }
    }
    const payload = { articles };
    return {
        sectionType: 'NEWS',
        itemIdentifier: buildItemIdentifier(articles),
        source,
        generatedAt: new Date().toISOString(),
        notice,
        data: payload,
    };
};
exports.getNewsSection = getNewsSection;
/** Exposed so the insight prompt can reuse headlines without a second fetch. */
const getHeadlinesForPrompt = async (symbols) => {
    const section = await (0, exports.getNewsSection)(symbols);
    return section.data.articles.slice(0, 4);
};
exports.getHeadlinesForPrompt = getHeadlinesForPrompt;
//# sourceMappingURL=news.service.js.map