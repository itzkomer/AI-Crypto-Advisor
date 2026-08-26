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
exports.profileRouter = void 0;
/**
 * GET /api/profile          - current preferences (null until onboarded)
 * PUT /api/profile          - submit / update onboarding answers
 * GET /api/profile/options  - the question catalog the onboarding UI renders
 */
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const profileService = __importStar(require("../services/profile.service"));
const assets_1 = require("../data/assets");
const types_1 = require("../types");
const saveProfileSchema = zod_1.z.object({
    assets: zod_1.z
        .array(zod_1.z.enum(types_1.ASSET_SYMBOLS))
        .min(1, 'Pick at least one asset.')
        .max(types_1.ASSET_SYMBOLS.length)
        // De-duplicate so the DB never stores ["BTC","BTC"].
        .transform((values) => [...new Set(values)]),
    archetype: zod_1.z.enum(types_1.INVESTOR_ARCHETYPES),
    contentTypes: zod_1.z
        .array(zod_1.z.enum(types_1.CONTENT_TYPES))
        .min(1, 'Pick at least one content type.')
        .max(types_1.CONTENT_TYPES.length)
        .transform((values) => [...new Set(values)]),
    goal: zod_1.z.string().trim().max(280, 'Keep it under 280 characters.').optional().nullable(),
});
exports.profileRouter = (0, express_1.Router)();
exports.profileRouter.use(auth_1.authenticate);
/**
 * Served from the API so the onboarding UI and the validation schema can never
 * drift apart - the client renders exactly the options the server accepts.
 */
exports.profileRouter.get('/options', (_req, res) => {
    res.status(200).json({
        assets: types_1.ASSET_SYMBOLS.map((symbol) => ({
            value: symbol,
            label: assets_1.ASSET_CATALOG[symbol].name,
            symbol,
        })),
        archetypes: types_1.INVESTOR_ARCHETYPES.map((archetype) => ({
            value: archetype,
            label: assets_1.ARCHETYPE_META[archetype].label,
            description: assets_1.ARCHETYPE_META[archetype].description,
        })),
        contentTypes: types_1.CONTENT_TYPES.map((contentType) => ({
            value: contentType,
            label: assets_1.CONTENT_TYPE_META[contentType].label,
        })),
    });
});
exports.profileRouter.get('/', (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    res.status(200).json({ profile: await profileService.getProfile(id) });
}));
exports.profileRouter.put('/', (0, validate_1.validate)(saveProfileSchema), (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    const body = req.body;
    const profile = await profileService.saveProfile(id, {
        assets: body.assets,
        archetype: body.archetype,
        contentTypes: body.contentTypes,
        goal: body.goal ?? null,
    });
    res.status(200).json({ profile });
}));
//# sourceMappingURL=profile.routes.js.map