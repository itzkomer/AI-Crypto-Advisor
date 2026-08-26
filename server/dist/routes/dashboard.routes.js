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
exports.dashboardRouter = void 0;
/**
 * Dashboard sections. Each card has its own endpoint so the four sections load,
 * skeleton and fail independently in the UI.
 *
 * GET /api/dashboard/prices
 * GET /api/dashboard/news
 * GET /api/dashboard/insight     (?refresh=true to regenerate today's insight)
 * GET /api/dashboard/meme        (?shuffle=true to bypass the meme cache)
 * GET /api/dashboard             aggregate (used for the initial paint)
 */
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../lib/logger");
const profileService = __importStar(require("../services/profile.service"));
const prices_service_1 = require("../services/prices.service");
const news_service_1 = require("../services/news.service");
const insight_service_1 = require("../services/insight.service");
const meme_service_1 = require("../services/meme.service");
const booleanFlag = zod_1.z
    .union([zod_1.z.literal('true'), zod_1.z.literal('false'), zod_1.z.literal('1'), zod_1.z.literal('0')])
    .optional()
    .transform((value) => value === 'true' || value === '1');
const refreshQuerySchema = zod_1.z.object({ refresh: booleanFlag });
const shuffleQuerySchema = zod_1.z.object({ shuffle: booleanFlag });
exports.dashboardRouter = (0, express_1.Router)();
exports.dashboardRouter.use(auth_1.authenticate);
exports.dashboardRouter.get('/prices', (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    const profile = await profileService.getEffectiveProfile(id);
    res.status(200).json(await (0, prices_service_1.getPricesSection)(profile.assets));
}));
exports.dashboardRouter.get('/news', (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    const profile = await profileService.getEffectiveProfile(id);
    res.status(200).json(await (0, news_service_1.getNewsSection)(profile.assets));
}));
exports.dashboardRouter.get('/insight', (0, validate_1.validate)(refreshQuerySchema, 'query'), (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    const { refresh } = req.query;
    const profile = await profileService.getEffectiveProfile(id);
    res.status(200).json(await (0, insight_service_1.getInsightSection)(id, profile, { force: refresh }));
}));
exports.dashboardRouter.get('/meme', (0, validate_1.validate)(shuffleQuerySchema, 'query'), (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    const { shuffle } = req.query;
    res.status(200).json(shuffle ? await (0, meme_service_1.shuffleMeme)(id) : await (0, meme_service_1.getMemeSection)(id));
}));
/**
 * Aggregate endpoint. Uses allSettled so one dead upstream cannot take the whole
 * dashboard down - failed sections come back as `null` and the client keeps its
 * per-card error state for them.
 */
exports.dashboardRouter.get('/', (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    const profile = await profileService.getEffectiveProfile(id);
    const [prices, news, insight, meme] = await Promise.allSettled([
        (0, prices_service_1.getPricesSection)(profile.assets),
        (0, news_service_1.getNewsSection)(profile.assets),
        (0, insight_service_1.getInsightSection)(id, profile),
        (0, meme_service_1.getMemeSection)(id),
    ]);
    const unwrap = (result, section) => {
        if (result.status === 'fulfilled')
            return result.value;
        logger_1.logger.error('Dashboard section failed', {
            section,
            userId: id,
            error: String(result.reason),
        });
        return null;
    };
    res.status(200).json({
        profile,
        sections: {
            prices: unwrap(prices, 'PRICES'),
            news: unwrap(news, 'NEWS'),
            insight: unwrap(insight, 'INSIGHT'),
            meme: unwrap(meme, 'MEME'),
        },
    });
}));
//# sourceMappingURL=dashboard.routes.js.map