"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveProfile = exports.getEffectiveProfile = exports.getProfile = exports.DEFAULT_PROFILE = void 0;
/**
 * Onboarding preferences.
 *
 * Handles the encode/decode boundary for the JSON-string list columns and is the
 * only place the rest of the app gets a typed `UserProfile` from.
 */
const prisma_1 = require("../lib/prisma");
const cache_1 = require("../lib/cache");
const json_1 = require("../utils/json");
const date_1 = require("../utils/date");
const assets_1 = require("../data/assets");
const types_1 = require("../types");
const toUserProfile = (row) => ({
    assets: (0, json_1.decodeList)(row.assets, types_1.ASSET_SYMBOLS, assets_1.DEFAULT_ASSETS),
    archetype: row.archetype,
    contentTypes: (0, json_1.decodeList)(row.contentTypes, types_1.CONTENT_TYPES, ['MARKET_NEWS']),
    goal: row.goal,
    completedAt: (0, date_1.toIso)(row.completedAt),
    updatedAt: row.updatedAt.toISOString(),
});
/** Used when a user reaches the dashboard without finishing onboarding. */
exports.DEFAULT_PROFILE = {
    assets: assets_1.DEFAULT_ASSETS,
    archetype: 'HODLER',
    contentTypes: ['MARKET_NEWS'],
    goal: null,
    completedAt: null,
    updatedAt: new Date(0).toISOString(),
};
const getProfile = async (userId) => {
    const row = await prisma_1.prisma.profile.findUnique({
        where: { userId },
        select: {
            assets: true,
            archetype: true,
            contentTypes: true,
            goal: true,
            completedAt: true,
            updatedAt: true,
        },
    });
    return row ? toUserProfile(row) : null;
};
exports.getProfile = getProfile;
/** Never null - dashboard services personalize off this. */
const getEffectiveProfile = async (userId) => (await (0, exports.getProfile)(userId)) ?? exports.DEFAULT_PROFILE;
exports.getEffectiveProfile = getEffectiveProfile;
const saveProfile = async (userId, input) => {
    const goal = input.goal?.trim() ? input.goal.trim() : null;
    const now = new Date();
    const row = await prisma_1.prisma.profile.upsert({
        where: { userId },
        create: {
            userId,
            assets: (0, json_1.encodeList)(input.assets),
            archetype: input.archetype,
            contentTypes: (0, json_1.encodeList)(input.contentTypes),
            goal,
            completedAt: now,
        },
        update: {
            assets: (0, json_1.encodeList)(input.assets),
            archetype: input.archetype,
            contentTypes: (0, json_1.encodeList)(input.contentTypes),
            goal,
            // `completedAt` is intentionally omitted so edits preserve the original
            // completion timestamp; it is backfilled below if it was never set.
        },
        select: {
            assets: true,
            archetype: true,
            contentTypes: true,
            goal: true,
            completedAt: true,
            updatedAt: true,
        },
    });
    // Preferences changed => any personalized cache entry for this user is wrong.
    (0, cache_1.invalidateCache)(`prices:${userId}`);
    (0, cache_1.invalidateCache)(`news:${userId}`);
    (0, cache_1.invalidateCache)(`meme:${userId}`);
    // Backfill for rows whose onboarding was previously saved as a draft.
    if (!row.completedAt) {
        const patched = await prisma_1.prisma.profile.update({
            where: { userId },
            data: { completedAt: now },
            select: {
                assets: true,
                archetype: true,
                contentTypes: true,
                goal: true,
                completedAt: true,
                updatedAt: true,
            },
        });
        return toUserProfile(patched);
    }
    return toUserProfile(row);
};
exports.saveProfile = saveProfile;
//# sourceMappingURL=profile.service.js.map