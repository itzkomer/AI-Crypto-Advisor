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
import { logger } from './logger';

interface CacheEntry<T> {
  value: T;
  /** Epoch ms after which the entry is stale. */
  expiresAt: number;
  storedAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Evicts expired entries once the map grows past this, keeping memory bounded. */
const MAX_ENTRIES = 500;

const sweep = (): void => {
  const now = Date.now();
  for (const [key, entry] of store) {
    // Keep stale-but-recent entries: they are the fallback layer.
    if (now - entry.storedAt > 24 * 60 * 60 * 1000) store.delete(key);
  }
  if (store.size > MAX_ENTRIES) {
    const oldest = [...store.entries()].sort((a, b) => a[1].storedAt - b[1].storedAt);
    for (const [key] of oldest.slice(0, store.size - MAX_ENTRIES)) store.delete(key);
  }
};

export interface CacheHit<T> {
  value: T;
  isStale: boolean;
  ageSeconds: number;
}

export const readCache = <T>(key: string): CacheHit<T> | null => {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  const now = Date.now();
  return {
    value: entry.value,
    isStale: now > entry.expiresAt,
    ageSeconds: Math.round((now - entry.storedAt) / 1000),
  };
};

export const writeCache = <T>(key: string, value: T, ttlSeconds: number): void => {
  const now = Date.now();
  store.set(key, { value, expiresAt: now + ttlSeconds * 1000, storedAt: now });
  sweep();
};

export const invalidateCache = (keyPrefix: string): void => {
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) store.delete(key);
  }
};

export const clearCache = (): void => store.clear();

export type CacheResolution = 'live' | 'cache' | 'stale';

export interface CachedResult<T> {
  value: T;
  resolution: CacheResolution;
  /** Present when we served stale data because the upstream call failed. */
  error?: Error;
}

/**
 * Runs `producer` behind the cache, falling back to a stale entry on failure.
 * Rethrows only when there is nothing cached to serve.
 */
export const withCache = async <T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<CachedResult<T>> => {
  const hit = readCache<T>(key);

  if (hit && !hit.isStale) {
    return { value: hit.value, resolution: 'cache' };
  }

  try {
    const value = await producer();
    writeCache(key, value, ttlSeconds);
    return { value, resolution: 'live' };
  } catch (error) {
    if (hit) {
      logger.warn('Upstream failed - serving stale cache', {
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
