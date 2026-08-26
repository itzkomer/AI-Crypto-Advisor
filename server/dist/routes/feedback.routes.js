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
exports.feedbackRouter = void 0;
/**
 * POST   /api/feedback         - upsert a thumbs up/down vote
 * DELETE /api/feedback         - clear a vote
 * GET    /api/feedback         - the caller's votes (hydrates the widgets)
 * GET    /api/feedback/summary - per-section tallies
 * GET    /api/feedback/export  - (prompt, completion, label) rows for training
 */
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const feedbackService = __importStar(require("../services/feedback.service"));
const types_1 = require("../types");
const submitSchema = zod_1.z.object({
    sectionType: zod_1.z.enum(types_1.SECTION_TYPES),
    itemIdentifier: zod_1.z.string().trim().min(1).max(255),
    vote: zod_1.z.enum(types_1.VOTES),
    /** Free-form snapshot of the rated content; validated only for size. */
    context: zod_1.z.unknown().optional(),
});
const clearSchema = zod_1.z.object({
    sectionType: zod_1.z.enum(types_1.SECTION_TYPES),
    itemIdentifier: zod_1.z.string().trim().min(1).max(255),
});
exports.feedbackRouter = (0, express_1.Router)();
exports.feedbackRouter.use(auth_1.authenticate);
exports.feedbackRouter.post('/', (0, validate_1.validate)(submitSchema), (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    const body = req.body;
    const feedback = await feedbackService.submitFeedback(id, {
        sectionType: body.sectionType,
        itemIdentifier: body.itemIdentifier,
        vote: body.vote,
        context: body.context,
    });
    res.status(200).json({ feedback });
}));
exports.feedbackRouter.delete('/', (0, validate_1.validate)(clearSchema), (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    const body = req.body;
    await feedbackService.clearFeedback(id, body.sectionType, body.itemIdentifier);
    res.status(204).send();
}));
exports.feedbackRouter.get('/', (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    res.status(200).json({ feedback: await feedbackService.listFeedback(id) });
}));
exports.feedbackRouter.get('/summary', (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    res.status(200).json({ summary: await feedbackService.summarizeFeedback(id) });
}));
exports.feedbackRouter.get('/export', (0, validate_1.asyncHandler)(async (req, res) => {
    const { id } = (0, auth_1.requireUser)(req);
    const pairs = await feedbackService.exportPreferenceData(id);
    res.status(200).json({ count: pairs.length, pairs });
}));
//# sourceMappingURL=feedback.routes.js.map