"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickFallbackMeme = exports.FALLBACK_MEMES = exports.FALLBACK_NEWS = exports.fallbackPrices = void 0;
const assets_1 = require("./assets");
/* ------------------------------- Prices ------------------------------- */
/** Deterministic pseudo-random in [-1, 1) derived from a string seed. */
const seededUnit = (seed) => {
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    // >>> 0 keeps it unsigned before normalizing.
    return ((hash >>> 0) / 0xffffffff) * 2 - 1;
};
/**
 * Builds a plausible, *stable-per-day* price snapshot from the catalog's
 * reference prices. Stability matters: a fallback that jitters on every refresh
 * looks like a bug, and it would break feedback item identity.
 */
const fallbackPrices = (symbols, dateKey) => symbols.map((symbol) => {
    const definition = assets_1.ASSET_CATALOG[symbol];
    const drift = seededUnit(`${symbol}:${dateKey}`);
    const changePercent = Number((drift * 4.5).toFixed(2));
    const price = Number((definition.referencePriceUsd * (1 + drift * 0.03)).toFixed(definition.referencePriceUsd < 1 ? 4 : 2));
    const sparkline = Array.from({ length: 24 }, (_, index) => {
        const wobble = seededUnit(`${symbol}:${dateKey}:${index}`) * 0.015;
        return Number((price * (1 + wobble)).toFixed(definition.referencePriceUsd < 1 ? 4 : 2));
    });
    return {
        id: definition.coingeckoId,
        symbol,
        name: definition.name,
        image: null,
        priceUsd: price,
        change24hPercent: changePercent,
        marketCapUsd: null,
        volume24hUsd: null,
        sparkline,
    };
});
exports.fallbackPrices = fallbackPrices;
/* -------------------------------- News -------------------------------- */
/**
 * Evergreen, non-time-sensitive headlines. Written to be useful context rather
 * than fake breaking news, and tagged by asset so filtering still personalizes.
 */
exports.FALLBACK_NEWS = [
    {
        id: 'fallback-btc-etf',
        title: 'Spot Bitcoin ETF flows remain the dominant driver of BTC market structure',
        url: 'https://www.coingecko.com/en/coins/bitcoin',
        source: 'Curated Digest',
        publishedAt: '2025-01-06T09:00:00.000Z',
        currencies: ['BTC'],
        sentiment: 'neutral',
    },
    {
        id: 'fallback-eth-l2',
        title: 'Layer-2 activity keeps compressing Ethereum mainnet fees for everyday transfers',
        url: 'https://www.coingecko.com/en/coins/ethereum',
        source: 'Curated Digest',
        publishedAt: '2025-01-06T08:30:00.000Z',
        currencies: ['ETH'],
        sentiment: 'positive',
    },
    {
        id: 'fallback-sol-throughput',
        title: 'Solana throughput and fee markets stay in focus as consumer apps scale',
        url: 'https://www.coingecko.com/en/coins/solana',
        source: 'Curated Digest',
        publishedAt: '2025-01-06T07:45:00.000Z',
        currencies: ['SOL'],
        sentiment: 'positive',
    },
    {
        id: 'fallback-defi-yields',
        title: 'DeFi lending yields normalise as stablecoin supply expands across chains',
        url: 'https://defillama.com/',
        source: 'Curated Digest',
        publishedAt: '2025-01-06T07:10:00.000Z',
        currencies: ['ETH', 'SOL'],
        sentiment: 'neutral',
    },
    {
        id: 'fallback-ada-governance',
        title: 'Cardano on-chain governance participation continues to broaden',
        url: 'https://www.coingecko.com/en/coins/cardano',
        source: 'Curated Digest',
        publishedAt: '2025-01-06T06:50:00.000Z',
        currencies: ['ADA'],
        sentiment: 'neutral',
    },
    {
        id: 'fallback-macro-rates',
        title: 'Macro rate expectations still set the tone for high-beta crypto assets',
        url: 'https://www.coingecko.com/en/global-charts',
        source: 'Curated Digest',
        publishedAt: '2025-01-06T06:00:00.000Z',
        currencies: ['BTC', 'ETH', 'SOL', 'ADA'],
        sentiment: 'neutral',
    },
    {
        id: 'fallback-nft-volume',
        title: 'NFT marketplace volume concentrates into a smaller set of blue-chip collections',
        url: 'https://www.coingecko.com/en/nft',
        source: 'Curated Digest',
        publishedAt: '2025-01-06T05:30:00.000Z',
        currencies: ['ETH', 'SOL'],
        sentiment: 'negative',
    },
    {
        id: 'fallback-regulation',
        title: 'Regulatory clarity in major markets remains the top institutional gating factor',
        url: 'https://www.coingecko.com/en/news',
        source: 'Curated Digest',
        publishedAt: '2025-01-06T05:00:00.000Z',
        currencies: ['BTC', 'ETH', 'XRP'],
        sentiment: 'neutral',
    },
];
/* -------------------------------- Memes ------------------------------- */
/**
 * Rotating curated memes. Images are hosted on Reddit's CDN via permalinks that
 * are stable; if one rots the UI shows its image-error state and the user can
 * refresh for the next one in the rotation.
 */
exports.FALLBACK_MEMES = [
    {
        memeId: 'curated-hodl-1',
        title: 'When you finally understand "not your keys, not your coins"',
        imageUrl: 'https://placehold.co/800x600/0b1220/38bdf8?text=HODL+%F0%9F%92%8E%F0%9F%99%8C',
        postUrl: 'https://www.reddit.com/r/cryptocurrencymemes/',
        subreddit: 'cryptocurrencymemes',
        author: null,
    },
    {
        memeId: 'curated-dip-2',
        title: 'Me buying the dip, and then the dip buying a dip',
        imageUrl: 'https://placehold.co/800x600/0b1220/22c55e?text=Buy+The+Dip+%F0%9F%93%89',
        postUrl: 'https://www.reddit.com/r/cryptomemes/',
        subreddit: 'cryptomemes',
        author: null,
    },
    {
        memeId: 'curated-gas-3',
        title: 'Gas fees: $4. Transaction value: $3.',
        imageUrl: 'https://placehold.co/800x600/0b1220/f59e0b?text=Gas+Fees+%E2%9B%BD',
        postUrl: 'https://www.reddit.com/r/ethereum/',
        subreddit: 'cryptomemes',
        author: null,
    },
    {
        memeId: 'curated-chart-4',
        title: 'Technical analysis after three sleepless nights',
        imageUrl: 'https://placehold.co/800x600/0b1220/a855f7?text=TA+Wizard+%F0%9F%94%AE',
        postUrl: 'https://www.reddit.com/r/cryptocurrencymemes/',
        subreddit: 'cryptocurrencymemes',
        author: null,
    },
    {
        memeId: 'curated-diamond-5',
        title: 'Diamond hands until the exact moment before the pump',
        imageUrl: 'https://placehold.co/800x600/0b1220/ef4444?text=Paper+Hands+%F0%9F%93%84',
        postUrl: 'https://www.reddit.com/r/bitcoinmemes/',
        subreddit: 'bitcoinmemes',
        author: null,
    },
];
/**
 * Picks a curated meme deterministically from a seed so the same user/day gets
 * the same meme (again: stable feedback identity), but different users rotate.
 */
const pickFallbackMeme = (seed) => {
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = (hash * 31 + seed.charCodeAt(index)) % 100_000;
    }
    const meme = exports.FALLBACK_MEMES[hash % exports.FALLBACK_MEMES.length];
    // FALLBACK_MEMES is a non-empty literal, so this is always defined; the
    // assertion satisfies `noUncheckedIndexedAccess`.
    return meme;
};
exports.pickFallbackMeme = pickFallbackMeme;
//# sourceMappingURL=fallbacks.js.map