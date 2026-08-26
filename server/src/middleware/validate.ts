/**
 * Zod-backed request validation.
 *
 * Parses and *replaces* the target with the typed result, so downstream handlers
 * work with coerced, trusted values.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { ValidationError } from '../utils/errors';

type Target = 'body' | 'query' | 'params';

const flatten = (error: z.ZodError): Record<string, string[]> => {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_root';
    const existing = details[key];
    if (existing) existing.push(issue.message);
    else details[key] = [issue.message];
  }
  return details;
};

export const validate =
  <T extends z.ZodTypeAny>(schema: T, target: Target = 'body'): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(new ValidationError(flatten(result.error)));
      return;
    }

    // `req.query` and `req.params` are prototype getters with no setter in
    // Express, so plain assignment (or Object.assign) throws. Define an own
    // property instead, which shadows the getter safely.
    Object.defineProperty(req, target, {
      value: result.data as unknown,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    next();
  };

/** Wraps an async handler so rejections reach the error middleware. */
export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
