/**
 * Crypto meme - meme-api.com (a thin Reddit proxy) with a curated rotation.
 *
 * Endpoint: GET /gimme/<subreddit>
 * A random subreddit from MEME_SUBREDDITS is chosen per request so the section
 * feels alive; a per-user/day seed keeps the *fallback* stable instead.
 */
import { env } from '../config/env';
import { fetchJson } from '../lib/httpClient';
import { invalidateCache, readCache, writeCache } from '../lib/cache';
import { logger } from '../lib/logger';
import { utcDateKey } from '../utils/date';
import { pickFallbackMeme } from '../data/fallbacks';
import type { DataSource, MemePayload, MemeSection } from '../types';

interface MemeApiResponse {
  postLink?: string;
  subreddit?: string;
  title?: string;
  url?: string;
  nsfw?: boolean;
  spoiler?: boolean;
  author?: string;
  preview?: string[];
}

const IMAGE_PATTERN = /\.(jpe?g|png|gif|webp)$/i;

const pickSubreddit = (): string => {
  const list = env.MEME_SUBREDDITS;
  const index = Math.floor(Math.random() * list.length);
  return list[index] ?? 'cryptocurrencymemes';
};

const mapMeme = (response: MemeApiResponse, subreddit: string): MemePayload => {
  const imageUrl = response.url;

  if (!imageUrl || !IMAGE_PATTERN.test(imageUrl)) {
    throw new Error('Meme API returned a non-image asset.');
  }
  if (response.nsfw || response.spoiler) {
    throw new Error('Meme API returned NSFW/spoiler content.');
  }

  const postLink = response.postLink ?? null;

  return {
    // Reddit post slug is stable and unique; fall back to the image URL.
    memeId: `meme:${(postLink ?? imageUrl).split('/').filter(Boolean).pop() ?? 'unknown'}`,
    title: response.title?.trim() || 'Crypto meme of the day',
    imageUrl,
    postUrl: postLink,
    subreddit: response.subreddit ?? subreddit,
    author: response.author ?? null,
  };
};

const fetchLiveMeme = async (): Promise<MemePayload> => {
  const subreddit = pickSubreddit();
  const response = await fetchJson<MemeApiResponse>(
    `${env.MEME_API_BASE}/gimme/${encodeURIComponent(subreddit)}`,
    { provider: 'meme-api' },
  );
  return mapMeme(response, subreddit);
};

export const getMemeSection = async (userId: string): Promise<MemeSection> => {
  const cacheKey = `meme:${userId}`;

  let meme: MemePayload;
  let source: DataSource = 'live';
  let notice: string | null = null;

  const cached = readCache<MemePayload>(cacheKey);

  if (cached && !cached.isStale) {
    meme = cached.value;
    source = 'cache';
  } else {
    try {
      meme = await fetchLiveMeme();
      writeCache(cacheKey, meme, env.CACHE_TTL_MEME_SECONDS);
    } catch (error) {
      logger.warn('Meme fell back to curated rotation', { error: String(error) });
      if (cached) {
        meme = cached.value;
        source = 'cache';
        notice = 'Meme service is unavailable - showing the last one we loaded.';
      } else {
        meme = pickFallbackMeme(`${userId}:${utcDateKey()}`);
        source = 'fallback';
        notice = 'Meme service is unavailable - showing one from our curated stash.';
      }
    }
  }

  return {
    sectionType: 'MEME',
    itemIdentifier: meme.memeId,
    source,
    generatedAt: new Date().toISOString(),
    notice,
    data: meme,
  };
};

/** Drops the cached meme so "shuffle" in the UI really fetches a new one. */
export const shuffleMeme = async (userId: string): Promise<MemeSection> => {
  invalidateCache(`meme:${userId}`);
  return getMemeSection(userId);
};
