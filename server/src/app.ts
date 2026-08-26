/**
 * Express application wiring. Exported separately from the HTTP listener so it
 * can be imported directly by tests (e.g. supertest) without binding a port.
 */
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, isProduction } from './config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import { logger } from './lib/logger';

export const createApp = (): Express => {
  const app = express();

  // Behind Render/Railway/Vercel proxies, needed for correct client IPs
  // (rate limiting) and secure cookie handling.
  if (isProduction) app.set('trust proxy', 1);

  app.disable('x-powered-by');

  app.use(
    helmet({
      // The API serves JSON only; CSP belongs to the frontend host.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/non-browser callers (curl, health checks).
        if (!origin) return callback(null, true);
        if (env.CORS_ORIGIN.includes(origin) || env.CORS_ORIGIN.includes('*')) {
          return callback(null, true);
        }
        logger.warn('Blocked CORS origin', { origin });
        return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(express.json({ limit: '256kb' }));

  // Lightweight request logging; morgan would be overkill for four routers.
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      logger.debug(`${req.method} ${req.originalUrl}`, {
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
    next();
  });

  app.use('/api', apiLimiter, apiRouter);

  app.get('/', (_req, res) => {
    res.json({ name: 'AI Crypto Advisor API', version: '1.0.0', docs: '/api/health' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
