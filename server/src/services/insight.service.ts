/**
 * Daily AI Insight.
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

const SYSTEM_PROMPT =
  'You are a crypto market analyst. Write a direct 2-3 sentence market summary for a dashboard. Do not restate these instructions. Do not include analysis steps or outlines. Provide only the final prose.';

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

  const priceText = coins.length > 0 ? coins.map(formatPrice).join('; ') : 'No price data available';
  const headlineText = headlines.length > 0 ? headlines.map(formatHeadline).join('\n') : 'No recent headlines';

  return `Today is ${dateKey}.
The reader is a ${archetype.label} (${archetype.promptHint}) tracking: ${profile.assets.join(', ')}. Preferred tone: ${tone || 'informative'}.

Market Data:
${priceText}

Headlines:
${headlineText}

Write 2 to 3 sentences summarizing what today's data means for this reader. Include at least one exact number from the Market Data. Start directly with the summary.`;
};

/* ------------------------------------------------------------------ */
/* Post-processing                                                     */
/* ------------------------------------------------------------------ */

export const sanitizeCompletion = (raw: string): string => {
  if (!raw) return '';

  let text = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .trim();

  // If a thinking/reasoning breakdown was generated, capture everything after the marker
  const markers = [
    /(?:Here(?:'s| is) (?:a |the )?(?:draft|response|insight|final summary|summary)[^:]*:)/i,
    /\*\*Response:?\*\*/i,
    /\*\*Summary:?\*\*/i,
    /2\.\s*\*\*Draft (?:the )?Response:?\*\*/i,
  ];

  for (const marker of markers) {
    const match = text.split(marker);
    if (match.length > 1) {
      const candidate = match[match.length - 1]?.trim();
      if (candidate && candidate.length > 20) {
        text = candidate;
        break;
      }
    }
  }

  // Filter out meta-instruction lines
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        Boolean(l) &&
        !/^here['’]s a thinking process/i.test(l) &&
        !/^\d+\.\s*\*\*Analyze/i.test(l) &&
        !/^\*{1,2}(?:Role|Format|Constraints|Grounding|Tone|Audience|Input Data|Task):?\*{1,2}/i.test(l) &&
        !/^[-*•]\s*\*{1,2}(?:Role|Format|Constraints|Grounding|Tone|Audience|Task):?\*{1,2}/i.test(l),
    );

  text = lines.join(' ');

  text = text
    .replace(/^\s*(?:sure|certainly|here(?:'s| is)[^:]*):\s*/i, '')
    .replace(/[*_#>`]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';

  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length === 0) {
    return text.length > 420 ? `${text.slice(0, 417).trimEnd()}...` : text;
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
  choices?: Array<{
    message?: {
      content?: string | null;
    } | null;
  } | null>;
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
        temperature: 0.3,
        max_tokens: 1000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      },
    },
  );

  const message = response.choices?.[0]?.message;
  const content = message?.content ?? '';
  if (!content.trim()) throw new Error('OpenRouter returned an empty completion.');
  return content;
};

type HuggingFaceResponse = Array<{ generated_text?: string }> | { generated_text?: string };

const callHuggingFace = async (userPrompt: string): Promise<string> => {
  if (!env.HUGGINGFACE_API_KEY) throw new Error('HUGGINGFACE_API_KEY is not configured.');

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
          max_new_tokens: 250,
          temperature: 0.4,
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
      const raw = await provider.call();
      const sanitized = sanitizeCompletion(raw);
      if (sanitized) {
        return { content: sanitized, model: provider.model, prompt };
      }
      logger.warn('Insight provider returned unusable text after sanitize', {
        model: provider.model,
        raw,
      });
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
