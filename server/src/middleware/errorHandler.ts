/**
 * Centralised error rendering. Every thrown error becomes an `ApiErrorBody`, so
 * the client has exactly one error shape to parse.
 */
import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { logger } from '../lib/logger';
import { AppError, NotFoundError } from '../utils/errors';
import type { ApiErrorBody } from '../types';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

interface Normalized {
  statusCode: number;
  body: ApiErrorBody;
}

const normalize = (error: unknown): Normalized => {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 422,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: Object.fromEntries(
            error.issues.map((issue) => [issue.path.join('.') || '_root', [issue.message]]),
          ),
        },
      },
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = error.meta?.['target'];
      const field = Array.isArray(target) ? String(target[0]) : 'value';
      return {
        statusCode: 409,
        body: { error: { code: 'CONFLICT', message: `That ${field} is already in use.` } },
      };
    }
    if (error.code === 'P2025') {
      return {
        statusCode: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Resource not found.' } },
      };
    }
    return {
      statusCode: 400,
      body: { error: { code: `PRISMA_${error.code}`, message: 'Database request failed.' } },
    };
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return {
      statusCode: 400,
      body: { error: { code: 'MALFORMED_JSON', message: 'Request body is not valid JSON.' } },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: isProduction
          ? 'Something went wrong on our side.'
          : error instanceof Error
            ? error.message
            : String(error),
      },
    },
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express identifies error middleware by arity.
export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const { statusCode, body } = normalize(error);

  const context = {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code: body.error.code,
    userId: req.user?.id,
  };

  if (statusCode >= 500) {
    logger.error(body.error.message, {
      ...context,
      stack: error instanceof Error ? error.stack : undefined,
    });
  } else {
    logger.warn(body.error.message, context);
  }

  res.status(statusCode).json(body);
};
