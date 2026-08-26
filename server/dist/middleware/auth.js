"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = exports.authenticate = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../utils/errors");
const extractBearerToken = (header) => {
    if (!header)
        return null;
    const [scheme, token] = header.split(' ');
    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token)
        return null;
    return token.trim() || null;
};
const verifyToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        if (typeof decoded === 'string' || !decoded.sub || typeof decoded.sub !== 'string') {
            throw new errors_1.UnauthorizedError('Malformed token payload.');
        }
        return {
            sub: decoded.sub,
            email: typeof decoded['email'] === 'string' ? decoded['email'] : '',
        };
    }
    catch (error) {
        if (error instanceof errors_1.UnauthorizedError)
            throw error;
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new errors_1.UnauthorizedError('Session expired. Please sign in again.');
        }
        throw new errors_1.UnauthorizedError('Invalid or malformed token.');
    }
};
exports.verifyToken = verifyToken;
const authenticate = async (req, _res, next) => {
    try {
        const token = extractBearerToken(req.headers.authorization);
        if (!token)
            throw new errors_1.UnauthorizedError('Missing bearer token.');
        const payload = (0, exports.verifyToken)(token);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true, name: true },
        });
        if (!user)
            throw new errors_1.UnauthorizedError('Account no longer exists.');
        req.user = user;
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
/**
 * Narrows `req.user` for handlers mounted behind `authenticate`.
 * Throws rather than returning undefined so a routing mistake fails loudly.
 */
const requireUser = (req) => {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Authentication required.');
    }
    return req.user;
};
exports.requireUser = requireUser;
//# sourceMappingURL=auth.js.map