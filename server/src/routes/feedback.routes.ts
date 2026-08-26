/**
 * POST   /api/feedback         - upsert a thumbs up/down vote
 * DELETE /api/feedback         - clear a vote
 * GET    /api/feedback         - the caller's votes (hydrates the widgets)
 * GET    /api/feedback/summary - per-section tallies
 * GET    /api/feedback/export  - (prompt, completion, label) rows for training
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../middleware/validate';
import { authenticate, requireUser } from '../middleware/auth';
import * as feedbackService from '../services/feedback.service';
import { SECTION_TYPES, VOTES } from '../types';

const submitSchema = z.object({
  sectionType: z.enum(SECTION_TYPES),
  itemIdentifier: z.string().trim().min(1).max(255),
  vote: z.enum(VOTES),
  /** Free-form snapshot of the rated content; validated only for size. */
  context: z.unknown().optional(),
});

const clearSchema = z.object({
  sectionType: z.enum(SECTION_TYPES),
  itemIdentifier: z.string().trim().min(1).max(255),
});

export const feedbackRouter = Router();

feedbackRouter.use(authenticate);

feedbackRouter.post(
  '/',
  validate(submitSchema),
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    const body = req.body as z.infer<typeof submitSchema>;
    const feedback = await feedbackService.submitFeedback(id, {
      sectionType: body.sectionType,
      itemIdentifier: body.itemIdentifier,
      vote: body.vote,
      context: body.context,
    });
    res.status(200).json({ feedback });
  }),
);

feedbackRouter.delete(
  '/',
  validate(clearSchema),
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    const body = req.body as z.infer<typeof clearSchema>;
    await feedbackService.clearFeedback(id, body.sectionType, body.itemIdentifier);
    res.status(204).send();
  }),
);

feedbackRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    res.status(200).json({ feedback: await feedbackService.listFeedback(id) });
  }),
);

feedbackRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    res.status(200).json({ summary: await feedbackService.summarizeFeedback(id) });
  }),
);

feedbackRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const { id } = requireUser(req);
    const pairs = await feedbackService.exportPreferenceData(id);
    res.status(200).json({ count: pairs.length, pairs });
  }),
);
