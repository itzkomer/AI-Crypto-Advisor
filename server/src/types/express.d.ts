/**
 * Augments Express's Request with the authenticated principal attached by
 * `middleware/auth.ts`. Keeps handlers free of casts.
 */
import type { AuthenticatedUser } from '../middleware/auth';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
