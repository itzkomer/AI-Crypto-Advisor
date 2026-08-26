"use strict";
/** Typed application errors that the error middleware knows how to render. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toErrorMessage = exports.isAppError = exports.UpstreamError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.BadRequestError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, code, message, details) {
        super(message);
        this.name = new.target.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace?.(this, new.target);
    }
}
exports.AppError = AppError;
class BadRequestError extends AppError {
    constructor(message = 'Invalid request.', details) {
        super(400, 'BAD_REQUEST', message, details);
    }
}
exports.BadRequestError = BadRequestError;
class ValidationError extends AppError {
    constructor(details, message = 'Validation failed.') {
        super(422, 'VALIDATION_ERROR', message, details);
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required.') {
        super(401, 'UNAUTHORIZED', message);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'You do not have access to this resource.') {
        super(403, 'FORBIDDEN', message);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found.') {
        super(404, 'NOT_FOUND', message);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource already exists.') {
        super(409, 'CONFLICT', message);
    }
}
exports.ConflictError = ConflictError;
/** Raised by upstream integrations; callers catch this and serve a fallback. */
class UpstreamError extends AppError {
    provider;
    constructor(provider, message) {
        super(502, 'UPSTREAM_ERROR', message);
        this.provider = provider;
    }
}
exports.UpstreamError = UpstreamError;
const isAppError = (error) => error instanceof AppError;
exports.isAppError = isAppError;
/** Narrows an unknown catch value to a readable message. */
const toErrorMessage = (error) => {
    if (error instanceof Error)
        return error.message;
    if (typeof error === 'string')
        return error;
    return 'Unknown error';
};
exports.toErrorMessage = toErrorMessage;
//# sourceMappingURL=errors.js.map