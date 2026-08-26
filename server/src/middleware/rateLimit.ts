/**
 * Rate limiters. Auth endpoints get a tight limit (credential stuffing), the
 * rest of the API a generous one that mainly protects our upstream quotas.
 */
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import type { ApiErrorBody } from '../types';

const tooManyRequests = (message: string): ApiErrorBody => ({
  error: { code: 'RATE_LIMITED', message },
});

/** Disabled in tests so suites are not flaky. */
const skip = () => env.NODE_ENV === 'test';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: tooManyRequests('Too many authentication attempts. Try again in 15 minutes.'),
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: tooManyRequests('Too many requests. Please slow down.'),
});
