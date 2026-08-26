"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffleMeme = exports.getMemeSection = void 0;
/**
 * Crypto meme - meme-api.com (a thin Reddit proxy) with a curated rotation.
 *
 * Endpoint: GET /gimme/<subreddit>
 * A random subreddit from MEME_SUBREDDITS is chosen per request so the section
 * feels alive; a per-user/day seed keeps the *fallback* stable instead.
 */
const env_1 = require("../config/env");
const httpClient_1 = require("../lib/httpClient");
const cache_1 = require("../lib/cache");
const logger_1 = require("../lib/logger");
const date_1 = require("../utils/date");
const fallbacks_1 = require("../data/fallbacks");
const IMAGE_PATTERN = /\.(jpe?g|png|gif|webp)$/i;
const pickSubreddit = () => {
    const list = env_1.env.MEME_SUBREDDITS;
    const index = Math.floor(Math.random() * list.length);
    return list[index] ?? 'cryptocurrencymemes';
};
const mapMeme = (response, subreddit) => {
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
const fetchLiveMeme = async () => {
    const subreddit = pickSubreddit();
    const response = await (0, httpClient_1.fetchJson)(`${env_1.env.MEME_API_BASE}/gimme/${encodeURIComponent(subreddit)}`, { provider: 'meme-api' });
    return mapMeme(response, subreddit);
};
const getMemeSection = async (userId) => {
    const cacheKey = `meme:${userId}`;
    let meme;
    let source = 'live';
    let notice = null;
    const cached = (0, cache_1.readCache)(cacheKey);
    if (cached && !cached.isStale) {
        meme = cached.value;
        source = 'cache';
    }
    else {
        try {
            meme = await fetchLiveMeme();
            (0, cache_1.writeCache)(cacheKey, meme, env_1.env.CACHE_TTL_MEME_SECONDS);
        }
        catch (error) {
            logger_1.logger.warn('Meme fell back to curated rotation', { error: String(error) });
            if (cached) {
                meme = cached.value;
                source = 'cache';
                notice = 'Meme service is unavailable - showing the last one we loaded.';
            }
            else {
                meme = (0, fallbacks_1.pickFallbackMeme)(`${userId}:${(0, date_1.utcDateKey)()}`);
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
exports.getMemeSection = getMemeSection;
/** Drops the cached meme so "shuffle" in the UI really fetches a new one. */
const shuffleMeme = async (userId) => {
    (0, cache_1.invalidateCache)(`meme:${userId}`);
    return (0, exports.getMemeSection)(userId);
};
exports.shuffleMeme = shuffleMeme;
//# sourceMappingURL=meme.service.js.map