/**
 * Asset catalog: the bridge between our internal symbols and each provider's
 * identifier scheme (CoinGecko ids, CryptoPanic currency codes).
 *
 * Adding an asset is a one-line change here plus the symbol in
 * `types/index.ts#ASSET_SYMBOLS`.
 */
import type { AssetSymbol, InvestorArchetype, ContentType } from '../types';

export interface AssetDefinition {
  symbol: AssetSymbol;
  name: string;
  /** CoinGecko `id` used by /coins/markets. */
  coingeckoId: string;
  /** CryptoPanic `currencies` code. */
  cryptoPanicCode: string;
  /** Used by the static fallback and as a sanity anchor in the AI prompt. */
  referencePriceUsd: number;
}

export const ASSET_CATALOG: Record<AssetSymbol, AssetDefinition> = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    coingeckoId: 'bitcoin',
    cryptoPanicCode: 'BTC',
    referencePriceUsd: 64_800,
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    coingeckoId: 'ethereum',
    cryptoPanicCode: 'ETH',
    referencePriceUsd: 3_150,
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    coingeckoId: 'solana',
    cryptoPanicCode: 'SOL',
    referencePriceUsd: 148,
  },
  ADA: {
    symbol: 'ADA',
    name: 'Cardano',
    coingeckoId: 'cardano',
    cryptoPanicCode: 'ADA',
    referencePriceUsd: 0.46,
  },
  XRP: {
    symbol: 'XRP',
    name: 'XRP',
    coingeckoId: 'ripple',
    cryptoPanicCode: 'XRP',
    referencePriceUsd: 0.58,
  },
  DOGE: {
    symbol: 'DOGE',
    name: 'Dogecoin',
    coingeckoId: 'dogecoin',
    cryptoPanicCode: 'DOGE',
    referencePriceUsd: 0.13,
  },
  AVAX: {
    symbol: 'AVAX',
    name: 'Avalanche',
    coingeckoId: 'avalanche-2',
    cryptoPanicCode: 'AVAX',
    referencePriceUsd: 27.4,
  },
  MATIC: {
    symbol: 'MATIC',
    name: 'Polygon',
    coingeckoId: 'matic-network',
    cryptoPanicCode: 'MATIC',
    referencePriceUsd: 0.52,
  },
};

export const DEFAULT_ASSETS: AssetSymbol[] = ['BTC', 'ETH'];

export const getAsset = (symbol: AssetSymbol): AssetDefinition => ASSET_CATALOG[symbol];

/** Reverse lookup for mapping a CoinGecko response row back to our symbol. */
export const symbolByCoingeckoId = (): Map<string, AssetSymbol> => {
  const map = new Map<string, AssetSymbol>();
  for (const definition of Object.values(ASSET_CATALOG)) {
    map.set(definition.coingeckoId, definition.symbol);
  }
  return map;
};

/* ------------------------------------------------------------------ */
/* Human-readable labels + prompt hints for personalization           */
/* ------------------------------------------------------------------ */

export const ARCHETYPE_META: Record<
  InvestorArchetype,
  { label: string; description: string; promptHint: string }
> = {
  HODLER: {
    label: 'HODLer',
    description: 'Long-term conviction, low trade frequency.',
    promptHint:
      'a long-term holder who cares about multi-year conviction, accumulation zones and ignoring short-term noise',
  },
  DAY_TRADER: {
    label: 'Day Trader',
    description: 'Short-term momentum and volatility.',
    promptHint:
      'an active day trader who cares about intraday volatility, momentum shifts, volume and near-term levels',
  },
  NFT_COLLECTOR: {
    label: 'NFT Collector',
    description: 'Collections, mints and creator ecosystems.',
    promptHint:
      'an NFT collector who cares about mint activity, marketplace volume, collection floors and the health of creator ecosystems',
  },
  DEFI_ENTHUSIAST: {
    label: 'DeFi Enthusiast',
    description: 'Yields, protocols and on-chain activity.',
    promptHint:
      'a DeFi user who cares about yields, TVL shifts, protocol risk, stablecoin flows and on-chain activity',
  },
};

export const CONTENT_TYPE_META: Record<ContentType, { label: string; promptHint: string }> = {
  MARKET_NEWS: { label: 'Market News', promptHint: 'headline-driven market context' },
  CHARTS: { label: 'Charts & Technicals', promptHint: 'price action and technical framing' },
  SOCIAL_SENTIMENT: { label: 'Social Sentiment', promptHint: 'crowd sentiment and social momentum' },
  FUN_MEMES: { label: 'Fun & Memes', promptHint: 'a light, playful tone' },
};
