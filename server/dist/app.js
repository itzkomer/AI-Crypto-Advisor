"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
/**
 * Express application wiring. Exported separately from the HTTP listener so it
 * can be imported directly by tests (e.g. supertest) without binding a port.
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./config/env");
const routes_1 = require("./routes");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimit_1 = require("./middleware/rateLimit");
const logger_1 = require("./lib/logger");
const createApp = () => {
    const app = (0, express_1.default)();
    // Behind Render/Railway/Vercel proxies, needed for correct client IPs
    // (rate limiting) and secure cookie handling.
    if (env_1.isProduction)
        app.set('trust proxy', 1);
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)({
        // The API serves JSON only; CSP belongs to the frontend host.
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.use((0, cors_1.default)({
        origin(origin, callback) {
            // Allow same-origin/non-browser callers (curl, health checks).
            if (!origin)
                return callback(null, true);
            if (env_1.env.CORS_ORIGIN.includes(origin) || env_1.env.CORS_ORIGIN.includes('*')) {
                return callback(null, true);
            }
            logger_1.logger.warn('Blocked CORS origin', { origin });
            return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }));
    app.use(express_1.default.json({ limit: '256kb' }));
    // Lightweight request logging; morgan would be overkill for four routers.
    app.use((req, res, next) => {
        const startedAt = Date.now();
        res.on('finish', () => {
            logger_1.logger.debug(`${req.method} ${req.originalUrl}`, {
                status: res.statusCode,
                durationMs: Date.now() - startedAt,
            });
        });
        next();
    });
    app.use('/api', rateLimit_1.apiLimiter, routes_1.apiRouter);
    app.get('/', (_req, res) => {
        res.json({ name: 'AI Crypto Advisor API', version: '1.0.0', docs: '/api/health' });
    });
    app.use(errorHandler_1.notFoundHandler);
    app.use(errorHandler_1.errorHandler);
    return app;
};
exports.createApp = createApp;
//# sourceMappingURL=app.js.map