"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const env_1 = require("../config/env");
const logger_1 = require("../lib/logger");
const errors_1 = require("../utils/errors");
const notFoundHandler = (req, _res, next) => {
    next(new errors_1.NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};
exports.notFoundHandler = notFoundHandler;
const normalize = (error) => {
    if (error instanceof errors_1.AppError) {
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
    if (error instanceof zod_1.ZodError) {
        return {
            statusCode: 422,
            body: {
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed.',
                    details: Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || '_root', [issue.message]])),
                },
            },
        };
    }
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
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
                message: env_1.isProduction
                    ? 'Something went wrong on our side.'
                    : error instanceof Error
                        ? error.message
                        : String(error),
            },
        },
    };
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express identifies error middleware by arity.
const errorHandler = (error, req, res, _next) => {
    const { statusCode, body } = normalize(error);
    const context = {
        method: req.method,
        path: req.originalUrl,
        statusCode,
        code: body.error.code,
        userId: req.user?.id,
    };
    if (statusCode >= 500) {
        logger_1.logger.error(body.error.message, {
            ...context,
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
    else {
        logger_1.logger.warn(body.error.message, context);
    }
    res.status(statusCode).json(body);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map