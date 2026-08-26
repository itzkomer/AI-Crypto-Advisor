import { Router } from 'express';
import { authRouter } from './auth.routes';
import { profileRouter } from './profile.routes';
import { dashboardRouter } from './dashboard.routes';
import { feedbackRouter } from './feedback.routes';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/validate';

export const apiRouter = Router();

/** Liveness + DB readiness. Render/Railway health checks point here. */
apiRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    let database = 'up';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    res.status(database === 'up' ? 200 : 503).json({
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }),
);

apiRouter.use('/auth', authRouter);
apiRouter.use('/profile', profileRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/feedback', feedbackRouter);
