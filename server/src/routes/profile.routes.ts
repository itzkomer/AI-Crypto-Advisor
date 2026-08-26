/**
 * GET /api/profile          - current preferences (null until onboarded)
 * PUT /api/profile          - submit / update onboarding answers
 * GET /api/profile/options  - the question catalog the onboarding UI renders
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../middleware/validate';
import { authenticate, requireUser } from '../middleware/auth';
import * as profileService from '../services/profile.service';
import { ARCHETYPE_META, ASSET_CATALOG, CONTENT_TYPE_META } from '../data/assets';
import {
  ASSET_SYMBOLS,
  CONTENT_TYPES,
  INVESTOR_ARCHETYPES,
  type AssetSymbol,
  type ContentType,
  type InvestorArchetype,
} from '../types';

const saveProfileSchema = z.object({
  assets: z
    .array(z.enum(ASSET_SYMBOLS))
    .min(1, 'Pick at least one asset.')
    .max(ASSET_SYMBOLS.length)
    // De-duplicate so the DB never stores ["BTC","BTC"].
    .transform((values) => [...new Set(values)] as AssetSymbol[]),
  archetype: z.enum(INVESTOR_ARCHETYPES),
  contentTypes: z
    .array(z.enum(CONTENT_TYPES))
    .min(1, 'Pick at least one content type.')
    .max(CONTENT_TYPES.length)
    .transform((values) => [...new Set(values)] as ContentType[]),
  goal: z.string().trim().max(280, 'Keep it under 280 characters.').optional().nullable(),
});

export const profileRouter = Router();

profileRouter.use(authenticate);

/**
 * Served from the API so the onboarding UI and the validation schema can never
 * drift apart - the client renders exactly the options the server accepts.
 */
profileRouter.get('/options', (_req, res) => {
  res.status(200).json({
    assets: ASSET_SYMBOLS.map((symbol) => ({
      value: symbol,
      label: ASSET_CATALOG[symbol].name,
      symbol,
    })),
    archetypes: INVESTOR_ARCHETYPES.map((archetype: InvestorArchetype) => ({
      value: archetype,
      label: ARCHETYPE_META[archetype].label,
      description: ARCHETYPE_META[archetype].description,
    })),
    contentTypes: CONTENT_TYPES.map((contentType) => ({
      value: contentType,
      label: CONTENT_TYPE_META[contentType].label,
    })),
  });
});

profileRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    res.status(200).json({ profile: await profileService.getProfile(id) });
  }),
);

profileRouter.put(
  '/',
  validate(saveProfileSchema),
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    const body = req.body as z.infer<typeof saveProfileSchema>;
    const profile = await profileService.saveProfile(id, {
      assets: body.assets,
      archetype: body.archetype,
      contentTypes: body.contentTypes,
      goal: body.goal ?? null,
    });
    res.status(200).json({ profile });
  }),
);
