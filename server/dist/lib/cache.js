"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withCache = exports.clearCache = exports.invalidateCache = exports.writeCache = exports.readCache = void 0;
/**
 * In-memory TTL cache with stale-on-error semantics.
 *
 * The free tiers of CoinGecko/CryptoPanic rate-limit aggressively, so every
 * upstream read goes through here:
 *   1. fresh hit   -> serve immediately, source = 'cache'
 *   2. miss        -> fetch upstream, store, source = 'live'
 *   3. upstream    -> serve the *expired* entry if we still have one
 *      failure        (source = 'cache' + notice), else a curated fallback.
 *
 * Single-process only. For multi-instance deployments swap this module for Redis
 * (`ioredis`) - the `withCache` signature is intentionally storage-agnostic.
 */
const logger_1 = require("./logger");
const store = new Map();
/** Evicts expired entries once the map grows past this, keeping memory bounded. */
const MAX_ENTRIES = 500;
const sweep = () => {
    const now = Date.now();
    for (const [key, entry] of store) {
        // Keep stale-but-recent entries: they are the fallback layer.
        if (now - entry.storedAt > 24 * 60 * 60 * 1000)
            store.delete(key);
    }
    if (store.size > MAX_ENTRIES) {
        const oldest = [...store.entries()].sort((a, b) => a[1].storedAt - b[1].storedAt);
        for (const [key] of oldest.slice(0, store.size - MAX_ENTRIES))
            store.delete(key);
    }
};
const readCache = (key) => {
    const entry = store.get(key);
    if (!entry)
        return null;
    const now = Date.now();
    return {
        value: entry.value,
        isStale: now > entry.expiresAt,
        ageSeconds: Math.round((now - entry.storedAt) / 1000),
    };
};
exports.readCache = readCache;
const writeCache = (key, value, ttlSeconds) => {
    const now = Date.now();
    store.set(key, { value, expiresAt: now + ttlSeconds * 1000, storedAt: now });
    sweep();
};
exports.writeCache = writeCache;
const invalidateCache = (keyPrefix) => {
    for (const key of store.keys()) {
        if (key.startsWith(keyPrefix))
            store.delete(key);
    }
};
exports.invalidateCache = invalidateCache;
const clearCache = () => store.clear();
exports.clearCache = clearCache;
/**
 * Runs `producer` behind the cache, falling back to a stale entry on failure.
 * Rethrows only when there is nothing cached to serve.
 */
const withCache = async (key, ttlSeconds, producer) => {
    const hit = (0, exports.readCache)(key);
    if (hit && !hit.isStale) {
        return { value: hit.value, resolution: 'cache' };
    }
    try {
        const value = await producer();
        (0, exports.writeCache)(key, value, ttlSeconds);
        return { value, resolution: 'live' };
    }
    catch (error) {
        if (hit) {
            logger_1.logger.warn('Upstream failed - serving stale cache', {
                key,
                ageSeconds: hit.ageSeconds,
                error: String(error),
            });
            return {
                value: hit.value,
                resolution: 'stale',
                error: error instanceof Error ? error : new Error(String(error)),
            };
        }
        throw error;
    }
};
exports.withCache = withCache;
//# sourceMappingURL=cache.js.map