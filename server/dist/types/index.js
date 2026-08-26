"use strict";
/**
 * Single source of truth for every API payload the client can observe.
 *
 * `client/src/types/api.ts` mirrors this file verbatim. When you change a
 * contract here, update the client copy in the same commit.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VOTES = exports.SECTION_TYPES = exports.CONTENT_TYPES = exports.INVESTOR_ARCHETYPES = exports.ASSET_SYMBOLS = void 0;
/* ------------------------------------------------------------------ */
/* Domain enums (string unions - portable across SQLite and Postgres) */
/* ------------------------------------------------------------------ */
exports.ASSET_SYMBOLS = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'AVAX', 'MATIC'];
exports.INVESTOR_ARCHETYPES = ['HODLER', 'DAY_TRADER', 'NFT_COLLECTOR', 'DEFI_ENTHUSIAST'];
exports.CONTENT_TYPES = ['MARKET_NEWS', 'CHARTS', 'SOCIAL_SENTIMENT', 'FUN_MEMES'];
exports.SECTION_TYPES = ['PRICES', 'NEWS', 'INSIGHT', 'MEME'];
exports.VOTES = ['UP', 'DOWN'];
//# sourceMappingURL=index.js.map