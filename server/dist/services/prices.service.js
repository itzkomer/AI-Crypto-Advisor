"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPricesSection = void 0;
/**
 * Coin prices - CoinGecko free API with cache + static fallback.
 *
 * Endpoint: GET /coins/markets?vs_currency=usd&ids=...&sparkline=true
 * Free tier is heavily rate-limited (~5-15 req/min), so results are cached by
 * the exact asset set and stale entries are served when we get a 429.
 */
const env_1 = require("../config/env");
const httpClient_1 = require("../lib/httpClient");
const cache_1 = require("../lib/cache");
const logger_1 = require("../lib/logger");
const date_1 = require("../utils/date");
const assets_1 = require("../data/assets");
const fallbacks_1 = require("../data/fallbacks");
const cacheKey = (symbols) => `prices:global:${[...symbols].sort().join(',')}`;
const buildUrl = (symbols) => {
    const ids = symbols.map((symbol) => assets_1.ASSET_CATALOG[symbol].coingeckoId).join(',');
    const params = new URLSearchParams({
        vs_currency: 'usd',
        ids,
        order: 'market_cap_desc',
        per_page: String(symbols.length),
        page: '1',
        sparkline: 'true',
        price_change_percentage: '24h',
    });
    return `${env_1.env.COINGECKO_API_BASE}/coins/markets?${params.toString()}`;
};
/** Downsamples the 7d hourly sparkline (~168 points) to 32 for a lean payload. */
const downsample = (series, target = 32) => {
    if (series.length <= target)
        return series.map((value) => Number(value.toFixed(6)));
    const step = series.length / target;
    return Array.from({ length: target }, (_, index) => {
        const value = series[Math.min(series.length - 1, Math.floor(index * step))] ?? 0;
        return Number(value.toFixed(6));
    });
};
const mapMarkets = (rows, requested) => {
    const bySymbol = (0, assets_1.symbolByCoingeckoId)();
    const mapped = new Map();
    for (const row of rows) {
        const symbol = bySymbol.get(row.id);
        if (!symbol)
            continue;
        mapped.set(symbol, {
            id: row.id,
            symbol,
            name: row.name || assets_1.ASSET_CATALOG[symbol].name,
            image: row.image ?? null,
            priceUsd: row.current_price ?? 0,
            change24hPercent: Number((row.price_change_percentage_24h ?? 0).toFixed(2)),
            marketCapUsd: row.market_cap ?? null,
            volume24hUsd: row.total_volume ?? null,
            sparkline: downsample(row.sparkline_in_7d?.price ?? []),
        });
    }
    // Preserve the user's chosen order and fill any coin CoinGecko omitted.
    const dateKey = (0, date_1.utcDateKey)();
    return requested.map((symbol) => {
        const hit = mapped.get(symbol);
        if (hit)
            return hit;
        const [synthetic] = (0, fallbacks_1.fallbackPrices)([symbol], dateKey);
        return synthetic;
    });
};
const fetchLivePrices = async (symbols) => {
    const headers = {};
    if (env_1.env.COINGECKO_API_KEY) {
        // Demo keys use x-cg-demo-api-key; pro keys use x-cg-pro-api-key. Sending
        // the demo header is harmless for pro plans that also accept it.
        headers['x-cg-demo-api-key'] = env_1.env.COINGECKO_API_KEY;
    }
    const rows = await (0, httpClient_1.fetchJson)(buildUrl(symbols), {
        provider: 'coingecko',
        headers,
    });
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('CoinGecko returned no rows.');
    }
    return mapMarkets(rows, symbols);
};
/** Deterministic identity for the rendered snapshot, used by the feedback widget. */
const buildItemIdentifier = (symbols) => `prices:${(0, date_1.utcDateKey)()}:${[...symbols].sort().join('-')}`;
const getPricesSection = async (symbols) => {
    const assets = symbols.length > 0 ? symbols : ['BTC', 'ETH'];
    let coins;
    let source = 'live';
    let notice = null;
    try {
        const result = await (0, cache_1.withCache)(cacheKey(assets), env_1.env.CACHE_TTL_PRICES_SECONDS, () => fetchLivePrices(assets));
        coins = result.value;
        source = result.resolution === 'live' ? 'live' : 'cache';
        if (result.resolution === 'stale') {
            notice = 'CoinGecko is unavailable right now - showing the last successful snapshot.';
        }
    }
    catch (error) {
        logger_1.logger.warn('Prices fell back to static data', { error: String(error) });
        coins = (0, fallbacks_1.fallbackPrices)(assets, (0, date_1.utcDateKey)());
        source = 'fallback';
        notice = 'Live prices are rate-limited - showing indicative reference values.';
    }
    const payload = { coins, currency: 'usd' };
    return {
        sectionType: 'PRICES',
        itemIdentifier: buildItemIdentifier(assets),
        source,
        generatedAt: new Date().toISOString(),
        notice,
        data: payload,
    };
};
exports.getPricesSection = getPricesSection;
//# sourceMappingURL=prices.service.js.map