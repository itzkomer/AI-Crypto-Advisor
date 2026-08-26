/**
 * Onboarding preferences.
 *
 * Handles the encode/decode boundary for the JSON-string list columns and is the
 * only place the rest of the app gets a typed `UserProfile` from.
 */
import { prisma } from '../lib/prisma';
import { invalidateCache } from '../lib/cache';
import { decodeList, encodeList } from '../utils/json';
import { toIso } from '../utils/date';
import { DEFAULT_ASSETS } from '../data/assets';
import {
  ASSET_SYMBOLS,
  CONTENT_TYPES,
  type AssetSymbol,
  type ContentType,
  type InvestorArchetype,
  type UserProfile,
} from '../types';

export interface SaveProfileInput {
  assets: AssetSymbol[];
  archetype: InvestorArchetype;
  contentTypes: ContentType[];
  goal?: string | null;
}

interface ProfileRow {
  assets: string;
  archetype: string;
  contentTypes: string;
  goal: string | null;
  completedAt: Date | null;
  updatedAt: Date;
}

const toUserProfile = (row: ProfileRow): UserProfile => ({
  assets: decodeList<AssetSymbol>(row.assets, ASSET_SYMBOLS, DEFAULT_ASSETS),
  archetype: row.archetype as InvestorArchetype,
  contentTypes: decodeList<ContentType>(row.contentTypes, CONTENT_TYPES, ['MARKET_NEWS']),
  goal: row.goal,
  completedAt: toIso(row.completedAt),
  updatedAt: row.updatedAt.toISOString(),
});

/** Used when a user reaches the dashboard without finishing onboarding. */
export const DEFAULT_PROFILE: UserProfile = {
  assets: DEFAULT_ASSETS,
  archetype: 'HODLER',
  contentTypes: ['MARKET_NEWS'],
  goal: null,
  completedAt: null,
  updatedAt: new Date(0).toISOString(),
};

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  const row = await prisma.profile.findUnique({
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

/** Never null - dashboard services personalize off this. */
export const getEffectiveProfile = async (userId: string): Promise<UserProfile> =>
  (await getProfile(userId)) ?? DEFAULT_PROFILE;

export const saveProfile = async (
  userId: string,
  input: SaveProfileInput,
): Promise<UserProfile> => {
  const goal = input.goal?.trim() ? input.goal.trim() : null;
  const now = new Date();

  const row = await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      assets: encodeList(input.assets),
      archetype: input.archetype,
      contentTypes: encodeList(input.contentTypes),
      goal,
      completedAt: now,
    },
    update: {
      assets: encodeList(input.assets),
      archetype: input.archetype,
      contentTypes: encodeList(input.contentTypes),
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
  invalidateCache(`prices:${userId}`);
  invalidateCache(`news:${userId}`);
  invalidateCache(`meme:${userId}`);

  // Backfill for rows whose onboarding was previously saved as a draft.
  if (!row.completedAt) {
    const patched = await prisma.profile.update({
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
