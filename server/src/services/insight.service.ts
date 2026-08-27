/**
 * Daily AI Insight.
 *
 * Pipeline:
 *   1. Gather grounding context (profile + live prices + top headlines).
 *   2. Build a tightly-scoped prompt (2-3 sentences, no financial advice).
 *   3. Try OpenRouter -> Hugging Face -> deterministic template.
 *   4. Persist as a `DailyInsight` row keyed by (userId, UTC date) so the
 *      insight is stable for the day and has a durable id for feedback rows.
 *
 * The prompt is stored alongside the completion because a (prompt, completion,
 * vote) triple is exactly the record a preference dataset needs later - see the
 * README's continuous-learning section.
 */
import { env } from '../config/env';
import { fetchJson } from '../lib/httpClient';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { utcDateKey } from '../utils/date';
import { ARCHETYPE_META, CONTENT_TYPE_META } from '../data/assets';
import { getPricesSection } from './prices.service';
import { getHeadlinesForPrompt } from './news.service';
import type { CoinPrice, InsightSection, NewsArticle, UserProfile } from '../types';

const FALLBACK_MODEL = 'fallback:template';
const MAX_SENTENCES = 3;

/* ------------------------------------------------------------------ */
/* Prompt construction                                                 */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = [
  'You are a concise crypto market analyst inside a personal dashboard.',
  'Write 2 to 3 sentences of plain prose. No lists, no headings, no markdown, no emojis.',
  'Ground every claim in the DATA block you are given; never invent numbers or events.',
  'Address the reader as "you". Be specific and useful, not generic hype.',
  'Never give financial advice or tell the reader to buy or sell. Describe conditions and what to watch.',
].join(' ');

const formatPrice = (coin: CoinPrice): string => {
  const price = coin.priceUsd < 1 ? coin.priceUsd.toFixed(4) : coin.priceUsd.toLocaleString('en-US');
  const sign = coin.change24hPercent >= 0 ? '+' : '';
  return `${coin.symbol} $${price} (${sign}${coin.change24hPercent.toFixed(2)}% 24h)`;
};

const formatHeadline = (article: NewsArticle): string => `- ${article.title} (${article.source})`;

export interface InsightContext {
  profile: UserProfile;
  coins: CoinPrice[];
  headlines: NewsArticle[];
  dateKey: string;
}

export const buildUserPrompt = (context: InsightContext): string => {
  const { profile, coins, headlines, dateKey } = context;
  const archetype = ARCHETYPE_META[profile.archetype];
  const tone = profile.contentTypes.map((type) => CONTENT_TYPE_META[type].promptHint).join(', ');

  return [
    `DATE (UTC): ${dateKey}`,
    '',
    'READER PROFILE',
    `- Investor type: ${archetype.label} - ${archetype.promptHint}.`,
    `- Tracked assets: ${profile.assets.join(', ')}.`,
    `- Prefers: ${tone || 'headline-driven market context'}.`,
    profile.goal ? `- Stated goal: ${profile.goal}` : null,
    '',
    'DATA - PRICES',
    coins.length > 0 ? coins.map(formatPrice).join('; ') : '- unavailable',
    '',
    'DATA - HEADLINES',
    headlines.length > 0 ? headlines.map(formatHeadline).join('\n') : '- unavailable',
    '',
    `TASK: Write 2-3 sentences summarising what today's data means for this specific reader, in the tone their preferences imply. Reference at least one concrete number from DATA - PRICES.`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
};

/* ------------------------------------------------------------------ */
/* Post-processing                                                     */
/* ------------------------------------------------------------------ */

/**
 * LLM output on free tiers is messy: markdown, preambles, runaway length.
 * Strip formatting and hard-cap to 3 sentences so the card never breaks layout.
 */
export const sanitizeCompletion = (raw: string): string => {
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\s*(?:sure|certainly|here(?:'s| is)[^:]*):\s*/i, '')
    .replace(/[*_#>`]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length === 0) {
    // No terminal punctuation - return a single trimmed sentence.
    return cleaned.length > 420 ? `${cleaned.slice(0, 417).trimEnd()}...` : cleaned;
  }

  return sentences
    .slice(0, MAX_SENTENCES)
    .map((sentence) => sentence.trim())
    .join(' ');
};

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string | null } | null } | null>;
}

const callOpenRouter = async (userPrompt: string): Promise<string> => {
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured.');

  const response = await fetchJson<OpenRouterResponse>(
    `${env.OPENROUTER_API_BASE}/chat/completions`,
    {
      provider: 'openrouter',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.OPENROUTER_SITE_URL,
        'X-Title': env.OPENROUTER_APP_NAME,
      },
      body: {
        model: env.OPENROUTER_MODEL,
        temperature: 0.6,
        max_tokens: 220,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      },
    },
  );

  const content = response.choices?.[0]?.message?.content ?? '';
  if (!content.trim()) throw new Error('OpenRouter returned an empty completion.');
  return content;
};

type HuggingFaceResponse = Array<{ generated_text?: string }> | { generated_text?: string };

const callHuggingFace = async (userPrompt: string): Promise<string> => {
  if (!env.HUGGINGFACE_API_KEY) throw new Error('HUGGINGFACE_API_KEY is not configured.');

  // Mistral instruct chat template.
  const prompt = `<s>[INST] ${SYSTEM_PROMPT}\n\n${userPrompt} [/INST]`;

  const response = await fetchJson<HuggingFaceResponse>(
    `${env.HUGGINGFACE_API_BASE}/models/${env.HUGGINGFACE_MODEL}`,
    {
      provider: 'huggingface',
      method: 'POST',
      headers: { Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}` },
      body: {
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.6,
          return_full_text: false,
        },
        options: { wait_for_model: true },
      },
    },
  );

  const content = Array.isArray(response)
    ? (response[0]?.generated_text ?? '')
    : (response.generated_text ?? '');

  if (!content.trim()) throw new Error('Hugging Face returned an empty completion.');
  return content;
};

/**
 * Deterministic, data-grounded summary used when no LLM is reachable.
 * Written to read like a real insight rather than an error message - it uses the
 * same numbers the model would have seen.
 */
export const templateInsight = (context: InsightContext): string => {
  const { profile, coins } = context;
  const archetype = ARCHETYPE_META[profile.archetype];

  if (coins.length === 0) {
    return `Markets data is temporarily unavailable, so there is nothing new to read into today for your ${profile.assets.join(
      ' / ',
    )} watchlist. As ${archetype.label === 'HODLer' ? 'a HODLer' : `a ${archetype.label}`}, this is a good moment to revisit your plan rather than react to noise.`;
  }

  const sorted = [...coins].sort((a, b) => b.change24hPercent - a.change24hPercent);
  const leader = sorted[0] as CoinPrice;
  const laggard = sorted[sorted.length - 1] as CoinPrice;
  const advancing = coins.filter((coin) => coin.change24hPercent > 0).length;
  const breadth =
    advancing === coins.length
      ? 'your whole watchlist is green'
      : advancing === 0
        ? 'your whole watchlist is red'
        : `${advancing} of ${coins.length} of your assets are up`;

  const focus: Record<UserProfile['archetype'], string> = {
    HODLER: 'Nothing here changes a long-term thesis, so treat the moves as noise unless they persist for weeks.',
    DAY_TRADER: 'Watch whether that leader holds its gain into the next session, since fading strength often marks the intraday high.',
    NFT_COLLECTOR: 'Majors setting the risk tone usually shows up in mint activity and floor prices a day or two later.',
    DEFI_ENTHUSIAST: 'Moves of this size tend to shift borrow demand and yields, so check your positions for rate or collateral drift.',
  };

  return [
    `Today ${breadth}: ${leader.symbol} leads at ${leader.change24hPercent >= 0 ? '+' : ''}${leader.change24hPercent.toFixed(2)}% while ${laggard.symbol} sits at ${laggard.change24hPercent >= 0 ? '+' : ''}${laggard.change24hPercent.toFixed(2)}%.`,
    focus[profile.archetype],
  ].join(' ');
};

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

interface GenerationResult {
  content: string;
  model: string;
  prompt: string;
}

const generate = async (context: InsightContext): Promise<GenerationResult> => {
  const prompt = buildUserPrompt(context);

  const providers: Array<{ model: string; call: () => Promise<string> }> = [
    { model: env.OPENROUTER_MODEL, call: () => callOpenRouter(prompt) },
    { model: env.HUGGINGFACE_MODEL, call: () => callHuggingFace(prompt) },
  ];

  for (const provider of providers) {
    try {
      const sanitized = sanitizeCompletion(await provider.call());
      if (sanitized) {
        return { content: sanitized, model: provider.model, prompt };
      }
      logger.warn('Insight provider returned unusable text', { model: provider.model });
    } catch (error) {
      logger.warn('Insight provider failed - trying next', {
        model: provider.model,
        error: String(error),
      });
    }
  }

  return { content: templateInsight(context), model: FALLBACK_MODEL, prompt };
};

const buildBasedOn = (context: InsightContext): string[] => {
  const chips = [
    `${context.profile.assets.length} tracked asset${context.profile.assets.length === 1 ? '' : 's'}`,
    ARCHETYPE_META[context.profile.archetype].label,
  ];
  if (context.coins.length > 0) chips.push('live prices');
  if (context.headlines.length > 0) chips.push(`${context.headlines.length} headlines`);
  return chips;
};

export interface GetInsightOptions {
  /** Ignore today's stored insight and generate a fresh one. */
  force?: boolean;
}

export const getInsightSection = async (
  userId: string,
  profile: UserProfile,
  options: GetInsightOptions = {},
): Promise<InsightSection> => {
  const dateKey = utcDateKey();

  if (!options.force) {
    const existing = await prisma.dailyInsight.findUnique({
      where: { userId_date: { userId, date: dateKey } },
      select: { id: true, content: true, model: true, date: true },
    });

    if (existing) {
      return {
        sectionType: 'INSIGHT',
        itemIdentifier: `insight:${existing.id}`,
        source: existing.model === FALLBACK_MODEL ? 'fallback' : 'cache',
        generatedAt: new Date().toISOString(),
        notice:
          existing.model === FALLBACK_MODEL
            ? 'No AI provider was reachable - this summary was generated from your data locally.'
            : null,
        data: {
          insightId: existing.id,
          content: existing.content,
          model: existing.model,
          date: existing.date,
          basedOn: buildBasedOn({ profile, coins: [], headlines: [], dateKey }),
        },
      };
    }
  }

  // Grounding context. Both sections already degrade gracefully on their own, so
  // allSettled here is belt-and-braces against an unexpected throw.
  const [pricesResult, headlinesResult] = await Promise.allSettled([
    getPricesSection(profile.assets),
    getHeadlinesForPrompt(profile.assets),
  ]);

  const context: InsightContext = {
    profile,
    coins: pricesResult.status === 'fulfilled' ? pricesResult.value.data.coins : [],
    headlines: headlinesResult.status === 'fulfilled' ? headlinesResult.value : [],
    dateKey,
  };

  const generated = await generate(context);

  const row = await prisma.dailyInsight.upsert({
    where: { userId_date: { userId, date: dateKey } },
    create: {
      userId,
      date: dateKey,
      content: generated.content,
      model: generated.model,
      prompt: generated.prompt,
    },
    update: {
      content: generated.content,
      model: generated.model,
      prompt: generated.prompt,
    },
    select: { id: true, content: true, model: true, date: true },
  });

  const usedFallback = generated.model === FALLBACK_MODEL;

  return {
    sectionType: 'INSIGHT',
    itemIdentifier: `insight:${row.id}`,
    source: usedFallback ? 'fallback' : 'live',
    generatedAt: new Date().toISOString(),
    notice: usedFallback
      ? 'No AI provider was reachable - this summary was generated from your data locally.'
      : null,
    data: {
      insightId: row.id,
      content: row.content,
      model: row.model,
      date: row.date,
      basedOn: buildBasedOn(context),
    },
  };
};
