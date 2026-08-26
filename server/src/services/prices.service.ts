/**
 * Coin prices - CoinGecko free API with cache + static fallback.
 *
 * Endpoint: GET /coins/markets?vs_currency=usd&ids=...&sparkline=true
 * Free tier is heavily rate-limited (~5-15 req/min), so results are cached by
 * the exact asset set and stale entries are served when we get a 429.
 */
import { env } from '../config/env';
import { fetchJson } from '../lib/httpClient';
import { withCache } from '../lib/cache';
import { logger } from '../lib/logger';
import { utcDateKey } from '../utils/date';
import { ASSET_CATALOG, symbolByCoingeckoId } from '../data/assets';
import { fallbackPrices } from '../data/fallbacks';
import type { AssetSymbol, CoinPrice, DataSource, PricesPayload, PricesSection } from '../types';

/** Shape of the fields we consume from CoinGecko's /coins/markets rows. */
interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image?: string | null;
  current_price?: number | null;
  price_change_percentage_24h?: number | null;
  market_cap?: number | null;
  total_volume?: number | null;
  sparkline_in_7d?: { price?: number[] | null } | null;
}

const cacheKey = (symbols: AssetSymbol[]): string => `prices:global:${[...symbols].sort().join(',')}`;

const buildUrl = (symbols: AssetSymbol[]): string => {
  const ids = symbols.map((symbol) => ASSET_CATALOG[symbol].coingeckoId).join(',');
  const params = new URLSearchParams({
    vs_currency: 'usd',
    ids,
    order: 'market_cap_desc',
    per_page: String(symbols.length),
    page: '1',
    sparkline: 'true',
    price_change_percentage: '24h',
  });
  return `${env.COINGECKO_API_BASE}/coins/markets?${params.toString()}`;
};

/** Downsamples the 7d hourly sparkline (~168 points) to 32 for a lean payload. */
const downsample = (series: number[], target = 32): number[] => {
  if (series.length <= target) return series.map((value) => Number(value.toFixed(6)));
  const step = series.length / target;
  return Array.from({ length: target }, (_, index) => {
    const value = series[Math.min(series.length - 1, Math.floor(index * step))] ?? 0;
    return Number(value.toFixed(6));
  });
};

const mapMarkets = (rows: CoinGeckoMarket[], requested: AssetSymbol[]): CoinPrice[] => {
  const bySymbol = symbolByCoingeckoId();
  const mapped = new Map<AssetSymbol, CoinPrice>();

  for (const row of rows) {
    const symbol = bySymbol.get(row.id);
    if (!symbol) continue;

    mapped.set(symbol, {
      id: row.id,
      symbol,
      name: row.name || ASSET_CATALOG[symbol].name,
      image: row.image ?? null,
      priceUsd: row.current_price ?? 0,
      change24hPercent: Number((row.price_change_percentage_24h ?? 0).toFixed(2)),
      marketCapUsd: row.market_cap ?? null,
      volume24hUsd: row.total_volume ?? null,
      sparkline: downsample(row.sparkline_in_7d?.price ?? []),
    });
  }

  // Preserve the user's chosen order and fill any coin CoinGecko omitted.
  const dateKey = utcDateKey();
  return requested.map((symbol) => {
    const hit = mapped.get(symbol);
    if (hit) return hit;
    const [synthetic] = fallbackPrices([symbol], dateKey);
    return synthetic as CoinPrice;
  });
};

const fetchLivePrices = async (symbols: AssetSymbol[]): Promise<CoinPrice[]> => {
  const headers: Record<string, string> = {};
  if (env.COINGECKO_API_KEY) {
    // Demo keys use x-cg-demo-api-key; pro keys use x-cg-pro-api-key. Sending
    // the demo header is harmless for pro plans that also accept it.
    headers['x-cg-demo-api-key'] = env.COINGECKO_API_KEY;
  }

  const rows = await fetchJson<CoinGeckoMarket[]>(buildUrl(symbols), {
    provider: 'coingecko',
    headers,
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('CoinGecko returned no rows.');
  }

  return mapMarkets(rows, symbols);
};

/** Deterministic identity for the rendered snapshot, used by the feedback widget. */
const buildItemIdentifier = (symbols: AssetSymbol[]): string =>
  `prices:${utcDateKey()}:${[...symbols].sort().join('-')}`;

export const getPricesSection = async (symbols: AssetSymbol[]): Promise<PricesSection> => {
  const assets = symbols.length > 0 ? symbols : (['BTC', 'ETH'] as AssetSymbol[]);

  let coins: CoinPrice[];
  let source: DataSource = 'live';
  let notice: string | null = null;

  try {
    const result = await withCache(
      cacheKey(assets),
      env.CACHE_TTL_PRICES_SECONDS,
      () => fetchLivePrices(assets),
    );
    coins = result.value;
    source = result.resolution === 'live' ? 'live' : 'cache';
    if (result.resolution === 'stale') {
      notice = 'CoinGecko is unavailable right now - showing the last successful snapshot.';
    }
  } catch (error) {
    logger.warn('Prices fell back to static data', { error: String(error) });
    coins = fallbackPrices(assets, utcDateKey());
    source = 'fallback';
    notice = 'Live prices are rate-limited - showing indicative reference values.';
  }

  const payload: PricesPayload = { coins, currency: 'usd' };

  return {
    sectionType: 'PRICES',
    itemIdentifier: buildItemIdentifier(assets),
    source,
    generatedAt: new Date().toISOString(),
    notice,
    data: payload,
  };
};
