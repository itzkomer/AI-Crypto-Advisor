/** Typed application errors that the error middleware knows how to render. */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, string[]>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request.', details?: Record<string, string[]>) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, string[]>, message = 'Validation failed.') {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource.') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists.') {
    super(409, 'CONFLICT', message);
  }
}

/** Raised by upstream integrations; callers catch this and serve a fallback. */
export class UpstreamError extends AppError {
  public readonly provider: string;

  constructor(provider: string, message: string) {
    super(502, 'UPSTREAM_ERROR', message);
    this.provider = provider;
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;

/** Narrows an unknown catch value to a readable message. */
export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
};
