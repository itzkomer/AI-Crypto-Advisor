"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = exports.login = exports.register = void 0;
/**
 * Registration, login and token issuance.
 */
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../utils/errors");
const toPublicUser = (user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    hasCompletedOnboarding: Boolean(user.profile?.completedAt),
});
const signToken = (payload) => {
    const options = {
        // JWT_EXPIRES_IN is a free-form duration string ("7d", "12h"); the typings
        // want a narrower literal union, so widen it here in one place.
        expiresIn: env_1.env.JWT_EXPIRES_IN,
    };
    return jsonwebtoken_1.default.sign({ sub: payload.sub, email: payload.email }, env_1.env.JWT_SECRET, options);
};
const normalizeEmail = (email) => email.trim().toLowerCase();
const register = async (input) => {
    const email = normalizeEmail(input.email);
    const existing = await prisma_1.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
        throw new errors_1.ConflictError('An account with that email already exists.');
    }
    const passwordHash = await bcryptjs_1.default.hash(input.password, env_1.env.BCRYPT_SALT_ROUNDS);
    const user = await prisma_1.prisma.user.create({
        data: { email, name: input.name.trim(), passwordHash },
        select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            profile: { select: { completedAt: true } },
        },
    });
    return {
        token: signToken({ sub: user.id, email: user.email }),
        user: toPublicUser(user),
    };
};
exports.register = register;
const login = async (input) => {
    const email = normalizeEmail(input.email);
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            createdAt: true,
            profile: { select: { completedAt: true } },
        },
    });
    // Compare against a dummy hash when the user is missing so response timing
    // does not reveal whether an email is registered.
    const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const passwordMatches = await bcryptjs_1.default.compare(input.password, hash);
    if (!user || !passwordMatches) {
        throw new errors_1.UnauthorizedError('Incorrect email or password.');
    }
    return {
        token: signToken({ sub: user.id, email: user.email }),
        user: toPublicUser(user),
    };
};
exports.login = login;
const getCurrentUser = async (userId) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            profile: { select: { completedAt: true } },
        },
    });
    if (!user)
        throw new errors_1.UnauthorizedError('Account no longer exists.');
    return toPublicUser(user);
};
exports.getCurrentUser = getCurrentUser;
//# sourceMappingURL=auth.service.js.map