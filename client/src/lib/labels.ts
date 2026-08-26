/** Display labels for the enum-like API values. */
import type { ContentType, InvestorArchetype, SectionType } from '@/types/api';

export const ARCHETYPE_LABELS: Record<InvestorArchetype, { label: string; description: string }> = {
  HODLER: { label: 'HODLer', description: 'Long-term conviction, low trade frequency.' },
  DAY_TRADER: { label: 'Day Trader', description: 'Short-term momentum and volatility.' },
  NFT_COLLECTOR: { label: 'NFT Collector', description: 'Collections, mints and creators.' },
  DEFI_ENTHUSIAST: { label: 'DeFi Enthusiast', description: 'Yields, protocols and on-chain data.' },
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  MARKET_NEWS: 'Market News',
  CHARTS: 'Charts & Technicals',
  SOCIAL_SENTIMENT: 'Social Sentiment',
  FUN_MEMES: 'Fun & Memes',
};

export const SECTION_LABELS: Record<SectionType, string> = {
  PRICES: 'Coin Prices',
  NEWS: 'Market News',
  INSIGHT: 'Daily AI Insight',
  MEME: 'Crypto Meme',
};
