/**
 * Dashboard sections. Each card has its own endpoint so the four sections load,
 * skeleton and fail independently in the UI.
 *
 * GET /api/dashboard/prices
 * GET /api/dashboard/news
 * GET /api/dashboard/insight     (?refresh=true to regenerate today's insight)
 * GET /api/dashboard/meme        (?shuffle=true to bypass the meme cache)
 * GET /api/dashboard             aggregate (used for the initial paint)
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../middleware/validate';
import { authenticate, requireUser } from '../middleware/auth';
import { logger } from '../lib/logger';
import * as profileService from '../services/profile.service';
import { getPricesSection } from '../services/prices.service';
import { getNewsSection } from '../services/news.service';
import { getInsightSection } from '../services/insight.service';
import { getMemeSection, shuffleMeme } from '../services/meme.service';
import type { SectionType } from '../types';

const booleanFlag = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .optional()
  .transform((value) => value === 'true' || value === '1');

const refreshQuerySchema = z.object({ refresh: booleanFlag });
const shuffleQuerySchema = z.object({ shuffle: booleanFlag });

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get(
  '/prices',
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    const profile = await profileService.getEffectiveProfile(id);
    res.status(200).json(await getPricesSection(profile.assets));
  }),
);

dashboardRouter.get(
  '/news',
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    const profile = await profileService.getEffectiveProfile(id);
    res.status(200).json(await getNewsSection(profile.assets));
  }),
);

dashboardRouter.get(
  '/insight',
  validate(refreshQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    const { refresh } = req.query as unknown as z.infer<typeof refreshQuerySchema>;
    const profile = await profileService.getEffectiveProfile(id);
    res.status(200).json(await getInsightSection(id, profile, { force: refresh }));
  }),
);

dashboardRouter.get(
  '/meme',
  validate(shuffleQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    const { shuffle } = req.query as unknown as z.infer<typeof shuffleQuerySchema>;
    res.status(200).json(shuffle ? await shuffleMeme(id) : await getMemeSection(id));
  }),
);

/**
 * Aggregate endpoint. Uses allSettled so one dead upstream cannot take the whole
 * dashboard down - failed sections come back as `null` and the client keeps its
 * per-card error state for them.
 */
dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    const profile = await profileService.getEffectiveProfile(id);

    const [prices, news, insight, meme] = await Promise.allSettled([
      getPricesSection(profile.assets),
      getNewsSection(profile.assets),
      getInsightSection(id, profile),
      getMemeSection(id),
    ]);

    const unwrap = <T>(result: PromiseSettledResult<T>, section: SectionType): T | null => {
      if (result.status === 'fulfilled') return result.value;
      logger.error('Dashboard section failed', {
        section,
        userId: id,
        error: String(result.reason),
      });
      return null;
    };

    res.status(200).json({
      profile,
      sections: {
        prices: unwrap(prices, 'PRICES'),
        news: unwrap(news, 'NEWS'),
        insight: unwrap(insight, 'INSIGHT'),
        meme: unwrap(meme, 'MEME'),
      },
    });
  }),
);
