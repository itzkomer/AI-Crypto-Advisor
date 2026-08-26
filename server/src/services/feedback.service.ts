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
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import type { FeedbackRecord, FeedbackSummary, SectionType, Vote } from '../types';

interface FeedbackRow {
  id: string;
  sectionType: string;
  itemIdentifier: string;
  vote: string;
  createdAt: Date;
  updatedAt: Date;
}

const toRecord = (row: FeedbackRow): FeedbackRecord => ({
  id: row.id,
  sectionType: row.sectionType as SectionType,
  itemIdentifier: row.itemIdentifier,
  vote: row.vote as Vote,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export interface SubmitFeedbackInput {
  sectionType: SectionType;
  itemIdentifier: string;
  vote: Vote;
  /** Arbitrary JSON-serialisable snapshot of the rated content. */
  context?: unknown;
}

/** Caps the stored snapshot so a pathological payload cannot bloat the table. */
const MAX_SNAPSHOT_CHARS = 8_000;

const serializeContext = (context: unknown): string | null => {
  if (context === undefined || context === null) return null;
  try {
    const json = JSON.stringify(context);
    if (!json) return null;
    return json.length > MAX_SNAPSHOT_CHARS ? json.slice(0, MAX_SNAPSHOT_CHARS) : json;
  } catch (error) {
    logger.warn('Dropped unserialisable feedback context', { error: String(error) });
    return null;
  }
};

export const submitFeedback = async (
  userId: string,
  input: SubmitFeedbackInput,
): Promise<FeedbackRecord> => {
  const contextSnapshot = serializeContext(input.context);

  const row = await prisma.feedback.upsert({
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

/** Removes a vote entirely (user clicked the already-active thumb). */
export const clearFeedback = async (
  userId: string,
  sectionType: SectionType,
  itemIdentifier: string,
): Promise<void> => {
  await prisma.feedback.deleteMany({
    where: { userId, sectionType, itemIdentifier },
  });
};

/**
 * All of a user's votes. The client hydrates the four widgets from this in one
 * request instead of querying per section.
 */
export const listFeedback = async (userId: string): Promise<FeedbackRecord[]> => {
  const rows = await prisma.feedback.findMany({
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

/** Per-section up/down tallies for the current user. */
export const summarizeFeedback = async (userId: string): Promise<FeedbackSummary[]> => {
  const grouped = await prisma.feedback.groupBy({
    by: ['sectionType', 'vote'],
    where: { userId },
    _count: { _all: true },
  });

  const summary = new Map<SectionType, FeedbackSummary>();

  for (const group of grouped) {
    const sectionType = group.sectionType as SectionType;
    const current = summary.get(sectionType) ?? { sectionType, up: 0, down: 0 };
    if (group.vote === 'UP') current.up += group._count._all;
    else current.down += group._count._all;
    summary.set(sectionType, current);
  }

  return [...summary.values()];
};

/* ------------------------------------------------------------------ */
/* Training-data export                                               */
/* ------------------------------------------------------------------ */

export interface PreferencePair {
  sectionType: SectionType;
  itemIdentifier: string;
  vote: Vote;
  /** The prompt that produced the content, when we have it (INSIGHT rows). */
  prompt: string | null;
  /** The content the user rated, reconstructed from the snapshot. */
  completion: string | null;
  context: unknown;
  createdAt: string;
}

/**
 * Exports the caller's own feedback as (prompt, completion, label) rows - the
 * raw material for the SFT/DPO pipeline described in the README. Scoped to the
 * authenticated user; a real deployment would gate a global export behind an
 * admin role and a consent flag.
 */
export const exportPreferenceData = async (userId: string): Promise<PreferencePair[]> => {
  const rows = await prisma.feedback.findMany({
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

  const insights =
    insightIds.length > 0
      ? await prisma.dailyInsight.findMany({
          where: { id: { in: insightIds } },
          select: { id: true, prompt: true, content: true },
        })
      : [];

  const insightById = new Map(insights.map((insight) => [insight.id, insight]));

  return rows.map((row) => {
    const insight =
      row.sectionType === 'INSIGHT'
        ? insightById.get(row.itemIdentifier.replace(/^insight:/, ''))
        : undefined;

    let parsedContext: unknown = null;
    if (row.contextSnapshot) {
      try {
        parsedContext = JSON.parse(row.contextSnapshot);
      } catch {
        parsedContext = null;
      }
    }

    return {
      sectionType: row.sectionType as SectionType,
      itemIdentifier: row.itemIdentifier,
      vote: row.vote as Vote,
      prompt: insight?.prompt ?? null,
      completion: insight?.content ?? null,
      context: parsedContext,
      createdAt: row.createdAt.toISOString(),
    };
  });
};
