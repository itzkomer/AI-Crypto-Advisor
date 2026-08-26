# AI Crypto Advisor — Overview

**Submission for the Moveo coding task.** A personalized crypto dashboard: users register, answer a short onboarding questionnaire, and get a dashboard of four sections tailored to their answers, each with thumbs up/down feedback captured for later model training.

**Stack.** React 18 + Vite + TypeScript + Tailwind (client) · Node/Express 4 + TypeScript (API) · Prisma ORM over SQLite locally and PostgreSQL in production · JWT auth with `bcryptjs` hashing. Strict TypeScript throughout, with one shared API contract mirrored on both sides.

### What it does

Registration routes new users straight into a three-step questionnaire (tracked assets, investor archetype, preferred content types, optional free-text goal). Those answers drive every section of the dashboard: **live coin prices** (CoinGecko) for the chosen assets with 7-day sparklines, **market news** (CryptoPanic) filtered to those assets, a **daily AI insight** (OpenRouter → Hugging Face, free-tier Mistral-7B) written in the tone the archetype implies, and a **crypto meme**. Each card carries a 👍/👎 widget that persists to a `Feedback` table alongside a snapshot of exactly what was rated.

### Engineering decisions worth noting

**Graceful degradation is the core of the design.** Four free-tier APIs will fail during a demo, so every upstream call passes through a TTL cache with three tiers: fresh cache → live fetch → *stale* cache → curated fallback. Crucially, the tier is part of the API contract and rendered as a `Live`/`Cached`/`Fallback` badge — showing an invented BTC price labelled "live" would be the worst bug this app could ship. The whole dashboard works with **zero API keys configured**.

**Four independent queries, not one aggregate.** Each card owns its loading skeleton, error state and retry, so a rate-limited news provider can't blank the price card.

**Feedback designed to be trainable, not just stored.** `itemIdentifier` must stay stable for a vote to remain joinable later, which forced two designs the brief didn't specify: a `DailyInsight` table (so each insight has a durable id and its exact prompt is retained) and date-seeded deterministic fallbacks (so a rate-limited card doesn't change identity on refresh). The result is a replayable `(prompt, completion, human label)` triple — `GET /api/feedback/export` emits it directly.

**One schema, two databases.** SQLite is the source of truth so a fresh clone runs with no infrastructure; the PostgreSQL schema and its migration are *generated* from it by a script, with a drift check that fails the build. No manual schema edits at deploy time.

### Verification

`npm run verify` (schema drift + strict typecheck + build) passes clean on both workspaces. The API is verified end-to-end via curl: live CoinGecko and meme data, correct fallback labelling without keys, feedback upsert idempotency, cascade deletes, and 401/404/409/422 error paths. Personalization is confirmed — a HODLer and a Day Trader on the same market data receive materially different insights.

The README covers setup, the environment-variable checklist, the deployment guide, an AI tool interaction log (including bugs the AI introduced and how they were caught), and a detailed proposal for turning the collected feedback into continuous learning via few-shot injection, DPO preference pairs, and per-section ranking/bandit approaches.
