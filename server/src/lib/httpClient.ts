/**
 * Thin wrapper over global fetch (Node >= 18) adding timeouts, one retry on
 * transient failures, and typed error mapping to `UpstreamError`.
 */
import { env } from '../config/env';
import { logger } from './logger';
import { UpstreamError, toErrorMessage } from '../utils/errors';

export interface FetchJsonOptions {
  /** Label used in logs and error messages, e.g. "coingecko". */
  provider: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  /** Extra attempts after the first one. Default 1. */
  retries?: number;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Performs a JSON request and returns the parsed body.
 * Always throws `UpstreamError` on failure so callers have one thing to catch.
 */
export const fetchJson = async <T>(url: string, options: FetchJsonOptions): Promise<T> => {
  const {
    provider,
    method = 'GET',
    headers = {},
    body,
    timeoutMs = env.UPSTREAM_TIMEOUT_MS ?? 25000,
    retries = 1,
  } = options;

  const totalAttempts = retries + 1;
  let lastError: Error = new UpstreamError(provider, 'Request was never attempted.');

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ai-crypto-advisor/1.0',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const error = new UpstreamError(
          provider,
          `${provider} responded ${response.status} ${response.statusText}${
            text ? `: ${text.slice(0, 300)}` : ''
          }`,
        );

        if (RETRYABLE_STATUS.has(response.status) && attempt < totalAttempts) {
          lastError = error;
          logger.warn('Retrying upstream request', { provider, status: response.status, attempt });
          await sleep(250 * attempt);
          continue;
        }
        throw error;
      }

      return (await response.json()) as T;
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const normalized =
        error instanceof UpstreamError
          ? error
          : new UpstreamError(
              provider,
              isAbort
                ? `${provider} timed out after ${timeoutMs}ms`
                : `${provider} request failed: ${toErrorMessage(error)}`,
            );

      lastError = normalized;

      if (attempt < totalAttempts && !(error instanceof UpstreamError)) {
        logger.warn('Retrying upstream request', { provider, attempt, error: normalized.message });
        await sleep(250 * attempt);
        continue;
      }
      throw normalized;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
};
  const totalAttempts = retries + 1;
  let lastError: Error = new UpstreamError(provider, 'Request was never attempted.');

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ai-crypto-advisor/1.0',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const error = new UpstreamError(
          provider,
          `${provider} responded ${response.status} ${response.statusText}${
            text ? `: ${text.slice(0, 300)}` : ''
          }`,
        );

        if (RETRYABLE_STATUS.has(response.status) && attempt < totalAttempts) {
          lastError = error;
          logger.warn('Retrying upstream request', { provider, status: response.status, attempt });
          await sleep(250 * attempt);
          continue;
        }
        throw error;
      }

      return (await response.json()) as T;
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const normalized =
        error instanceof UpstreamError
          ? error
          : new UpstreamError(
              provider,
              isAbort
                ? `${provider} timed out after ${timeoutMs}ms`
                : `${provider} request failed: ${toErrorMessage(error)}`,
            );

      lastError = normalized;

      // Non-retryable HTTP errors already `throw` above; anything reaching here
      // (network/timeout) is worth one more shot.
      if (attempt < totalAttempts && !(error instanceof UpstreamError)) {
        logger.warn('Retrying upstream request', { provider, attempt, error: normalized.message });
        await sleep(250 * attempt);
        continue;
      }
      throw normalized;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
};
  const totalAttempts = retries + 1;
  let lastError: Error = new UpstreamError(provider, 'Request was never attempted.');

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ai-crypto-advisor/1.0',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const error = new UpstreamError(
          provider,
          `${provider} responded ${response.status} ${response.statusText}${
            text ? `: ${text.slice(0, 300)}` : ''
          }`,
        );

        if (RETRYABLE_STATUS.has(response.status) && attempt < totalAttempts) {
          lastError = error;
          logger.warn('Retrying upstream request', { provider, status: response.status, attempt });
          await sleep(250 * attempt);
          continue;
        }
        throw error;
      }

      return (await response.json()) as T;
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const normalized =
        error instanceof UpstreamError
          ? error
          : new UpstreamError(
              provider,
              isAbort
                ? `${provider} timed out after ${timeoutMs}ms`
                : `${provider} request failed: ${toErrorMessage(error)}`,
            );

      lastError = normalized;

      // Non-retryable HTTP errors already `throw` above; anything reaching here
      // (network/timeout) is worth one more shot.
      if (attempt < totalAttempts && !(error instanceof UpstreamError)) {
        logger.warn('Retrying upstream request', { provider, attempt, error: normalized.message });
        await sleep(250 * attempt);
        continue;
      }
      throw normalized;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
};
