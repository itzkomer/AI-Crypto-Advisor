"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPreferenceData = exports.summarizeFeedback = exports.listFeedback = exports.clearFeedback = exports.submitFeedback = void 0;
/**
 * Thumbs up / thumbs down capture.
 *
 * Design decisions worth knowing:
 *  - One row per (userId, sectionType, itemIdentifier). Re-voting UPDATEs, so we
 *    never double-count and the widget is idempotent.
 *  - `contextSnapshot` stores what the user actually saw plus the profile that
 *    produced it. Without it, a vote is an unusable label six months later.
 *  - Votes are never hard-deleted on toggle-off; the row is removed only when
 *    the user explicitly clears their vote, which keeps analytics honest.
 */
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../lib/logger");
const toRecord = (row) => ({
    id: row.id,
    sectionType: row.sectionType,
    itemIdentifier: row.itemIdentifier,
    vote: row.vote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
});
/** Caps the stored snapshot so a pathological payload cannot bloat the table. */
const MAX_SNAPSHOT_CHARS = 8_000;
const serializeContext = (context) => {
    if (context === undefined || context === null)
        return null;
    try {
        const json = JSON.stringify(context);
        if (!json)
            return null;
        return json.length > MAX_SNAPSHOT_CHARS ? json.slice(0, MAX_SNAPSHOT_CHARS) : json;
    }
    catch (error) {
        logger_1.logger.warn('Dropped unserialisable feedback context', { error: String(error) });
        return null;
    }
};
const submitFeedback = async (userId, input) => {
    const contextSnapshot = serializeContext(input.context);
    const row = await prisma_1.prisma.feedback.upsert({
        where: {
            userId_sectionType_itemIdentifier: {
                userId,
                sectionType: input.sectionType,
                itemIdentifier: input.itemIdentifier,
            },
        },
        create: {
            userId,
            sectionType: input.sectionType,
            itemIdentifier: input.itemIdentifier,
            vote: input.vote,
            contextSnapshot,
        },
        update: {
            vote: input.vote,
            // Keep the newest snapshot but never overwrite a good one with null.
            ...(contextSnapshot ? { contextSnapshot } : {}),
        },
        select: {
            id: true,
            sectionType: true,
            itemIdentifier: true,
            vote: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    return toRecord(row);
};
exports.submitFeedback = submitFeedback;
/** Removes a vote entirely (user clicked the already-active thumb). */
const clearFeedback = async (userId, sectionType, itemIdentifier) => {
    await prisma_1.prisma.feedback.deleteMany({
        where: { userId, sectionType, itemIdentifier },
    });
};
exports.clearFeedback = clearFeedback;
/**
 * All of a user's votes. The client hydrates the four widgets from this in one
 * request instead of querying per section.
 */
const listFeedback = async (userId) => {
    const rows = await prisma_1.prisma.feedback.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 200,
        select: {
            id: true,
            sectionType: true,
            itemIdentifier: true,
            vote: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    return rows.map(toRecord);
};
exports.listFeedback = listFeedback;
/** Per-section up/down tallies for the current user. */
const summarizeFeedback = async (userId) => {
    const grouped = await prisma_1.prisma.feedback.groupBy({
        by: ['sectionType', 'vote'],
        where: { userId },
        _count: { _all: true },
    });
    const summary = new Map();
    for (const group of grouped) {
        const sectionType = group.sectionType;
        const current = summary.get(sectionType) ?? { sectionType, up: 0, down: 0 };
        if (group.vote === 'UP')
            current.up += group._count._all;
        else
            current.down += group._count._all;
        summary.set(sectionType, current);
    }
    return [...summary.values()];
};
exports.summarizeFeedback = summarizeFeedback;
/**
 * Exports the caller's own feedback as (prompt, completion, label) rows - the
 * raw material for the SFT/DPO pipeline described in the README. Scoped to the
 * authenticated user; a real deployment would gate a global export behind an
 * admin role and a consent flag.
 */
const exportPreferenceData = async (userId) => {
    const rows = await prisma_1.prisma.feedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: 1_000,
        select: {
            sectionType: true,
            itemIdentifier: true,
            vote: true,
            contextSnapshot: true,
            createdAt: true,
        },
    });
    // Insight rows carry the exact prompt we sent upstream - join them in.
    const insightIds = rows
        .filter((row) => row.sectionType === 'INSIGHT')
        .map((row) => row.itemIdentifier.replace(/^insight:/, ''));
    const insights = insightIds.length > 0
        ? await prisma_1.prisma.dailyInsight.findMany({
            where: { id: { in: insightIds } },
            select: { id: true, prompt: true, content: true },
        })
        : [];
    const insightById = new Map(insights.map((insight) => [insight.id, insight]));
    return rows.map((row) => {
        const insight = row.sectionType === 'INSIGHT'
            ? insightById.get(row.itemIdentifier.replace(/^insight:/, ''))
            : undefined;
        let parsedContext = null;
        if (row.contextSnapshot) {
            try {
                parsedContext = JSON.parse(row.contextSnapshot);
            }
            catch {
                parsedContext = null;
            }
        }
        return {
            sectionType: row.sectionType,
            itemIdentifier: row.itemIdentifier,
            vote: row.vote,
            prompt: insight?.prompt ?? null,
            completion: insight?.content ?? null,
            context: parsedContext,
            createdAt: row.createdAt.toISOString(),
        };
    });
};
exports.exportPreferenceData = exportPreferenceData;
//# sourceMappingURL=feedback.service.js.map