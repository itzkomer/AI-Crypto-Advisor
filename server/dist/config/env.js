"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDevelopment = exports.isProduction = exports.env = void 0;
/**
 * Environment loading + validation.
 *
 * Fails fast at boot with a readable message instead of throwing an obscure
 * runtime error later. Every value the rest of the app reads comes from here,
 * so `process.env` is never touched outside this module.
 */
require("dotenv/config");
const zod_1 = require("zod");
const csv = (value) => value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
/** Treats empty strings as "unset" so a blank line in .env behaves like a missing key. */
const optionalString = zod_1.z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(4000),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: zod_1.z
        .string()
        .min(32, 'JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 48'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    BCRYPT_SALT_ROUNDS: zod_1.z.coerce.number().int().min(8).max(15).default(10),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:5173').transform(csv),
    COINGECKO_API_BASE: zod_1.z.string().url().default('https://api.coingecko.com/api/v3'),
    COINGECKO_API_KEY: optionalString,
    CRYPTOPANIC_API_BASE: zod_1.z.string().url().default('https://cryptopanic.com/api/v1'),
    CRYPTOPANIC_API_TOKEN: optionalString,
    OPENROUTER_API_BASE: zod_1.z.string().url().default('https://openrouter.ai/api/v1'),
    OPENROUTER_API_KEY: optionalString,
    OPENROUTER_MODEL: zod_1.z.string().default('mistralai/mistral-7b-instruct:free'),
    OPENROUTER_SITE_URL: zod_1.z.string().default('http://localhost:5173'),
    OPENROUTER_APP_NAME: zod_1.z.string().default('AI Crypto Advisor'),
    HUGGINGFACE_API_BASE: zod_1.z.string().url().default('https://api-inference.huggingface.co'),
    HUGGINGFACE_API_KEY: optionalString,
    HUGGINGFACE_MODEL: zod_1.z.string().default('mistralai/Mistral-7B-Instruct-v0.3'),
    MEME_API_BASE: zod_1.z.string().url().default('https://meme-api.com'),
    MEME_SUBREDDITS: zod_1.z
        .string()
        .default('cryptocurrencymemes,cryptomemes,bitcoinmemes')
        .transform(csv),
    CACHE_TTL_PRICES_SECONDS: zod_1.z.coerce.number().int().positive().default(60),
    CACHE_TTL_NEWS_SECONDS: zod_1.z.coerce.number().int().positive().default(300),
    CACHE_TTL_MEME_SECONDS: zod_1.z.coerce.number().int().positive().default(600),
    UPSTREAM_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(8_000),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const issues = parsed.error.issues
        .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
    // eslint-disable-next-line no-console
    console.error(`\nInvalid environment configuration:\n${issues}\n\nSee server/.env.example.\n`);
    process.exit(1);
}
exports.env = parsed.data;
exports.isProduction = exports.env.NODE_ENV === 'production';
exports.isDevelopment = exports.env.NODE_ENV === 'development';
//# sourceMappingURL=env.js.map