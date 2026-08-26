"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
/**
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 */
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const authService = __importStar(require("../services/auth.service"));
const passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password must be at most 72 characters.') // bcrypt truncates beyond 72 bytes.
    .regex(/[a-z]/, 'Password must contain a lowercase letter.')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
    .regex(/[0-9]/, 'Password must contain a number.');
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email('Enter a valid email address.').max(255),
    name: zod_1.z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
    password: passwordSchema,
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email('Enter a valid email address.'),
    password: zod_1.z.string().min(1, 'Password is required.'),
});
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/register', rateLimit_1.authLimiter, (0, validate_1.validate)(registerSchema), (0, validate_1.asyncHandler)(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
}));
exports.authRouter.post('/login', rateLimit_1.authLimiter, (0, validate_1.validate)(loginSchema), (0, validate_1.asyncHandler)(async (req, res) => {
    const result = await authService.login(req.body);
    res.status(200).json(result);
}));
exports.authRouter.get('/me', auth_1.authenticate, (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    res.status(200).json({ user: await authService.getCurrentUser(id) });
}));
//# sourceMappingURL=auth.routes.js.map