"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const auth_routes_1 = require("./auth.routes");
const profile_routes_1 = require("./profile.routes");
const dashboard_routes_1 = require("./dashboard.routes");
const feedback_routes_1 = require("./feedback.routes");
const prisma_1 = require("../lib/prisma");
const validate_1 = require("../middleware/validate");
exports.apiRouter = (0, express_1.Router)();
/** Liveness + DB readiness. Render/Railway health checks point here. */
exports.apiRouter.get('/health', (0, validate_1.asyncHandler)(async (_req, res) => {
    let database = 'up';
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
    }
    catch {
        database = 'down';
    }
    res.status(database === 'up' ? 200 : 503).json({
        status: database === 'up' ? 'ok' : 'degraded',
        database,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    });
}));
exports.apiRouter.use('/auth', auth_routes_1.authRouter);
exports.apiRouter.use('/profile', profile_routes_1.profileRouter);
exports.apiRouter.use('/dashboard', dashboard_routes_1.dashboardRouter);
exports.apiRouter.use('/feedback', feedback_routes_1.feedbackRouter);
//# sourceMappingURL=index.js.map