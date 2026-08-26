"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchJson = void 0;
/**
 * Thin wrapper over global fetch (Node >= 18) adding timeouts, one retry on
 * transient failures, and typed error mapping to `UpstreamError`.
 */
const env_1 = require("../config/env");
const logger_1 = require("./logger");
const errors_1 = require("../utils/errors");
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Performs a JSON request and returns the parsed body.
 * Always throws `UpstreamError` on failure so callers have one thing to catch.
 */
const fetchJson = async (url, options) => {
    const { provider, method = 'GET', headers = {}, body, timeoutMs = env_1.env.UPSTREAM_TIMEOUT_MS, retries = 1, } = options;
    const totalAttempts = retries + 1;
    let lastError = new errors_1.UpstreamError(provider, 'Request was never attempted.');
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
                const error = new errors_1.UpstreamError(provider, `${provider} responded ${response.status} ${response.statusText}${text ? `: ${text.slice(0, 300)}` : ''}`);
                if (RETRYABLE_STATUS.has(response.status) && attempt < totalAttempts) {
                    lastError = error;
                    logger_1.logger.warn('Retrying upstream request', { provider, status: response.status, attempt });
                    await sleep(250 * attempt);
                    continue;
                }
                throw error;
            }
            return (await response.json());
        }
        catch (error) {
            const isAbort = error instanceof Error && error.name === 'AbortError';
            const normalized = error instanceof errors_1.UpstreamError
                ? error
                : new errors_1.UpstreamError(provider, isAbort
                    ? `${provider} timed out after ${timeoutMs}ms`
                    : `${provider} request failed: ${(0, errors_1.toErrorMessage)(error)}`);
            lastError = normalized;
            // Non-retryable HTTP errors already `throw` above; anything reaching here
            // (network/timeout) is worth one more shot.
            if (attempt < totalAttempts && !(error instanceof errors_1.UpstreamError)) {
                logger_1.logger.warn('Retrying upstream request', { provider, attempt, error: normalized.message });
                await sleep(250 * attempt);
                continue;
            }
            throw normalized;
        }
        finally {
            clearTimeout(timer);
        }
    }
    throw lastError;
};
exports.fetchJson = fetchJson;
//# sourceMappingURL=httpClient.js.map