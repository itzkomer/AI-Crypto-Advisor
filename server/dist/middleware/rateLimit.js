"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiLimiter = exports.authLimiter = void 0;
/**
 * Rate limiters. Auth endpoints get a tight limit (credential stuffing), the
 * rest of the API a generous one that mainly protects our upstream quotas.
 */
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../config/env");
const tooManyRequests = (message) => ({
    error: { code: 'RATE_LIMITED', message },
});
/** Disabled in tests so suites are not flaky. */
const skip = () => env_1.env.NODE_ENV === 'test';
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip,
    message: tooManyRequests('Too many authentication attempts. Try again in 15 minutes.'),
});
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip,
    message: tooManyRequests('Too many requests. Please slow down.'),
});
//# sourceMappingURL=rateLimit.js.map