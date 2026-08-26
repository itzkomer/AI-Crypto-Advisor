"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTENT_TYPE_META = exports.ARCHETYPE_META = exports.symbolByCoingeckoId = exports.getAsset = exports.DEFAULT_ASSETS = exports.ASSET_CATALOG = void 0;
exports.ASSET_CATALOG = {
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
exports.DEFAULT_ASSETS = ['BTC', 'ETH'];
const getAsset = (symbol) => exports.ASSET_CATALOG[symbol];
exports.getAsset = getAsset;
/** Reverse lookup for mapping a CoinGecko response row back to our symbol. */
const symbolByCoingeckoId = () => {
    const map = new Map();
    for (const definition of Object.values(exports.ASSET_CATALOG)) {
        map.set(definition.coingeckoId, definition.symbol);
    }
    return map;
};
exports.symbolByCoingeckoId = symbolByCoingeckoId;
/* ------------------------------------------------------------------ */
/* Human-readable labels + prompt hints for personalization           */
/* ------------------------------------------------------------------ */
exports.ARCHETYPE_META = {
    HODLER: {
        label: 'HODLer',
        description: 'Long-term conviction, low trade frequency.',
        promptHint: 'a long-term holder who cares about multi-year conviction, accumulation zones and ignoring short-term noise',
    },
    DAY_TRADER: {
        label: 'Day Trader',
        description: 'Short-term momentum and volatility.',
        promptHint: 'an active day trader who cares about intraday volatility, momentum shifts, volume and near-term levels',
    },
    NFT_COLLECTOR: {
        label: 'NFT Collector',
        description: 'Collections, mints and creator ecosystems.',
        promptHint: 'an NFT collector who cares about mint activity, marketplace volume, collection floors and the health of creator ecosystems',
    },
    DEFI_ENTHUSIAST: {
        label: 'DeFi Enthusiast',
        description: 'Yields, protocols and on-chain activity.',
        promptHint: 'a DeFi user who cares about yields, TVL shifts, protocol risk, stablecoin flows and on-chain activity',
    },
};
exports.CONTENT_TYPE_META = {
    MARKET_NEWS: { label: 'Market News', promptHint: 'headline-driven market context' },
    CHARTS: { label: 'Charts & Technicals', promptHint: 'price action and technical framing' },
    SOCIAL_SENTIMENT: { label: 'Social Sentiment', promptHint: 'crowd sentiment and social momentum' },
    FUN_MEMES: { label: 'Fun & Memes', promptHint: 'a light, playful tone' },
};
//# sourceMappingURL=assets.js.map