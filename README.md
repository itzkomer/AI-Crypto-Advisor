# AI Crypto Advisor

> Moveo Coding Task — a personalized crypto dashboard with live prices, tailored news, an AI-generated daily insight, a crypto meme, and per-section thumbs up/down feedback captured for continuous learning.

<p align="left">
  <img alt="React" src="https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white">
</p>

---

## Table of Contents

1. [What it does](#1-what-it-does)
2. [Architecture](#2-architecture)
3. [Project structure](#3-project-structure)
4. [Quick start](#4-quick-start)
5. [Environment variables checklist](#5-environment-variables-checklist)
6. [Data model](#6-data-model)
7. [API reference](#7-api-reference)
8. [Design decisions worth knowing](#8-design-decisions-worth-knowing)
9. [Deployment guide](#9-deployment-guide)
10. [AI tool interaction log](#10-ai-tool-interaction-log)
11. [Bonus: turning feedback into continuous learning](#11-bonus-turning-feedback-into-continuous-learning)
12. [Known limitations & next steps](#12-known-limitations--next-steps)

---

## 1. What it does

| Flow | Behaviour |
| --- | --- |
| **Register / Login** | Email + name + password. `bcryptjs` hashing, JWT bearer tokens, zod-validated payloads. |
| **Onboarding** | 3-step questionnaire → tracked assets, investor archetype, preferred content types, optional free-text goal. New registrations are routed **straight to onboarding**; the same screen doubles as "edit preferences". |
| **Dashboard** | Responsive 2×2 grid of four independently-loading cards: **Coin Prices**, **Market News**, **Daily AI Insight**, **Crypto Meme** — each personalized from the stored profile. |
| **Feedback** | 👍/👎 on every card, persisted to a `Feedback` table with a snapshot of the exact content that was rated. Clicking the active thumb clears the vote. |

Every external integration is **best-effort with a labelled fallback**. If CoinGecko rate-limits, CryptoPanic has no token, the LLM is down, or the meme API 500s, the dashboard still renders — and the card shows a `Live` / `Cached` / `Fallback` badge so the user is never shown synthetic data dressed up as live market data.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│  client/  React 18 + Vite + Tailwind + TanStack Query    │
│                                                          │
│  AuthContext ──▶ localStorage JWT ──▶ apiClient (fetch)  │
│       │                                     │            │
│       ▼                                     ▼            │
│  route guards                       4 independent        │
│  (login → onboarding → dashboard)   section queries      │
└───────────────────────────┬──────────────────────────────┘
                            │  JSON over HTTP, Bearer token
┌───────────────────────────▼──────────────────────────────┐
│  server/  Express 4 + TypeScript                         │
│                                                          │
│  routes ──▶ zod validate ──▶ services ──▶ Prisma ──▶ DB  │
│                                 │                        │
│                                 ▼                        │
│                     TTL cache + stale-on-error           │
│                                 │                        │
│      ┌──────────────┬───────────┴────┬─────────────┐     │
│      ▼              ▼                ▼             ▼     │
│  CoinGecko    CryptoPanic     OpenRouter →    meme-api   │
│                               HuggingFace                │
│      │              │                │             │     │
│      ▼              ▼                ▼             ▼     │
│  static px     curated news     template     curated     │
│  fallback       digest          insight       memes      │
└──────────────────────────────────────────────────────────┘
```

**Three-tier degradation** for every upstream call (`server/src/lib/cache.ts`):

1. **fresh cache hit** → served immediately (`source: "cache"`)
2. **miss** → fetch upstream, store (`source: "live"`)
3. **upstream fails** → serve the *expired* entry if we have one, otherwise a curated fallback (`source: "cache" | "fallback"` + a human-readable `notice`)

---

## 3. Project structure

```
AI Crypto Advisor/
├── package.json                  # npm workspaces root + concurrently dev script
├── SUBMISSION.md                 # 1-page overview (the submission attachment)
├── render.yaml                   # Render blueprint (API + Postgres)
├── server/
│   ├── scripts/
│   │   └── sync-postgres-schema.mjs   # derives the Postgres schema from the SQLite one
│   ├── prisma/
│   │   ├── schema.prisma         # ⭐ source of truth: User, Profile, Feedback, DailyInsight
│   │   ├── postgres/             # GENERATED: prod schema + committed migrations
│   │   └── seed.ts               # demo@moveo.dev / Demo1234!
│   └── src/
│       ├── index.ts              # HTTP listener + graceful shutdown
│       ├── app.ts                # Express wiring (exported for tests)
│       ├── config/env.ts         # zod-validated env, fails fast at boot
│       ├── lib/                  # prisma, cache, httpClient, logger
│       ├── middleware/           # auth, validate, errorHandler, rateLimit
│       ├── routes/               # auth, profile, dashboard, feedback
│       ├── services/             # all business logic + integrations
│       ├── data/                 # asset catalog + curated fallbacks
│       ├── types/index.ts        # ⭐ single source of truth for API contracts
│       └── utils/                # errors, json, date, hash
└── client/
    ├── vercel.json               # SPA rewrites + asset caching
    └── src/
        ├── main.tsx              # QueryClient + Router + AuthProvider
        ├── App.tsx               # route table
        ├── routes/guards.tsx     # RequireAuth / RequireOnboarding
        ├── context/AuthContext   # token persistence + session bootstrap
        ├── hooks/                # useDashboard (one query per card), useFeedback
        ├── components/
        │   ├── ui/               # Button, Input, Skeleton, Alert, SourceBadge
        │   ├── layout/           # AppShell, Header
        │   └── dashboard/        # SectionCard, FeedbackWidget, 4 cards, Sparkline
        ├── pages/                # Login, Register, Onboarding, Dashboard, NotFound
        ├── lib/                  # apiClient, format, labels
        └── types/api.ts          # ⭐ mirrors server/src/types/index.ts
```

---

## 4. Quick start

**Prerequisites:** Node.js **≥ 20** and npm ≥ 9. No database server needed locally — SQLite is the default.

```bash
# 1. Install everything (npm workspaces installs client + server)
npm install

# 2. Create the server env file and set a JWT secret
cp server/.env.example server/.env
# then edit server/.env and set JWT_SECRET (min 32 chars):
#   openssl rand -base64 48

# 3. Create the SQLite schema and seed a demo user
npm run db:push
npm run db:seed

# 4. Run API (:4000) and UI (:5173) together
npm run dev
```

Open **http://localhost:5173** and sign in with the seeded account:

```
email:    demo@moveo.dev
password: Demo1234!
```

…or register a fresh account to see the onboarding flow.

> **npm ≥ 11 note.** Newer npm blocks dependency install scripts by default, which Prisma and esbuild need. The root `package.json` already ships the required `allowScripts` approvals, so `npm install` works out of the box. If you ever see `npm warn install-scripts` about `@prisma/client`, `prisma`, `@prisma/engines` or `esbuild`, run:
>
> ```bash
> npm install-scripts approve @prisma/client prisma @prisma/engines esbuild && npm install
> ```

> The client needs no `.env` locally — Vite proxies `/api` → `http://localhost:4000`, so there is no CORS in development. Copy `client/.env.example` → `client/.env` only when pointing at a deployed API.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API + UI concurrently, both with hot reload |
| `npm run build` | Type-check + build both workspaces |
| `npm run typecheck` | Strict `tsc --noEmit` across client and server |
| `npm run verify` | **schema drift check + typecheck + build.** The one command to run before pushing |
| `npm run db:push` | Push the Prisma schema to local SQLite (no migration files — dev only) |
| `npm run db:seed` | Idempotently upsert the demo user + profile |
| `npm run schema:sync` | Regenerate `prisma/postgres/schema.prisma` from the SQLite source |
| `npm run schema:check` | Fail if the generated Postgres schema has drifted |
| `npm run db:deploy` | Apply Postgres migrations (production) |
| `npm run db:studio` | Prisma Studio DB browser |

### Verifying it works without any API keys

Every third-party key is optional. With a bare `.env` (just `DATABASE_URL` + `JWT_SECRET`) you get:

- **Prices** — live from CoinGecko (no key needed on the free tier); a static, date-seeded snapshot if rate-limited.
- **News** — the curated digest, filtered to your assets, badged `Fallback`.
- **AI Insight** — the deterministic template summary, grounded in your real price data, badged `Fallback`.
- **Meme** — live from `meme-api.com`; the curated rotation if unreachable.

Add keys to upgrade each section to `Live`.

---

## 5. Environment variables checklist

Full annotated files: [`server/.env.example`](server/.env.example) and [`client/.env.example`](client/.env.example).

### `server/.env`

| Variable | Required | Default | Notes |
| --- | :---: | --- | --- |
| `NODE_ENV` | — | `development` | `development` \| `test` \| `production` |
| `PORT` | — | `4000` | |
| `DATABASE_URL` | ✅ | `file:./prisma/dev.db` | SQLite locally; Postgres URL in prod |
| `DIRECT_URL` | — | — | Only for Supabase's pooler (migrations) |
| `JWT_SECRET` | ✅ | — | **≥ 32 chars.** Boot fails otherwise. `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | — | `7d` | |
| `BCRYPT_SALT_ROUNDS` | — | `10` | 8–15 |
| `CORS_ORIGIN` | — | `http://localhost:5173` | Comma-separated allowlist |
| `COINGECKO_API_BASE` | — | `https://api.coingecko.com/api/v3` | |
| `COINGECKO_API_KEY` | — | — | Optional demo key, raises rate limits |
| `CRYPTOPANIC_API_BASE` | — | `https://cryptopanic.com/api/v1` | |
| `CRYPTOPANIC_API_TOKEN` | — | — | Without it, news uses the curated digest |
| `OPENROUTER_API_BASE` | — | `https://openrouter.ai/api/v1` | |
| `OPENROUTER_API_KEY` | — | — | Primary LLM provider |
| `OPENROUTER_MODEL` | — | `mistralai/mistral-7b-instruct:free` | Any OpenRouter model id |
| `OPENROUTER_SITE_URL` | — | `http://localhost:5173` | Sent as `HTTP-Referer` |
| `OPENROUTER_APP_NAME` | — | `AI Crypto Advisor` | Sent as `X-Title` |
| `HUGGINGFACE_API_BASE` | — | `https://api-inference.huggingface.co` | |
| `HUGGINGFACE_API_KEY` | — | — | Secondary LLM provider |
| `HUGGINGFACE_MODEL` | — | `mistralai/Mistral-7B-Instruct-v0.3` | |
| `MEME_API_BASE` | — | `https://meme-api.com` | |
| `MEME_SUBREDDITS` | — | `cryptocurrencymemes,cryptomemes,bitcoinmemes` | Comma-separated |
| `CACHE_TTL_PRICES_SECONDS` | — | `60` | |
| `CACHE_TTL_NEWS_SECONDS` | — | `300` | |
| `CACHE_TTL_MEME_SECONDS` | — | `600` | |
| `UPSTREAM_TIMEOUT_MS` | — | `8000` | Per-request timeout before fallback |

### `client/.env`

| Variable | Required | Notes |
| --- | :---: | --- |
| `VITE_API_BASE_URL` | prod only | Leave **empty** locally (Vite proxy handles `/api`). In prod: `https://your-api.onrender.com`, no trailing slash. |
| `VITE_DEV_API_TARGET` | — | Override the dev proxy target if the API isn't on `:4000`. |

Where to get free keys:
[OpenRouter](https://openrouter.ai/keys) · [CryptoPanic](https://cryptopanic.com/developers/api/) · [Hugging Face](https://huggingface.co/settings/tokens) · [CoinGecko](https://www.coingecko.com/en/api/pricing)

---

## 6. Data model

```prisma
User          id, email (unique), name, passwordHash, createdAt, updatedAt
Profile       userId (unique), assets, archetype, contentTypes, goal?, completedAt?
Feedback      userId, sectionType, itemIdentifier, vote, contextSnapshot?, createdAt, updatedAt
              @@unique([userId, sectionType, itemIdentifier])
DailyInsight  userId, date (YYYY-MM-DD), content, model, prompt?
              @@unique([userId, date])
```

Two schema choices worth calling out:

**1. No native enums, no scalar lists, no `Json` columns.** SQLite (local) doesn't support them, PostgreSQL (prod) does — so the schema deliberately sticks to the intersection. Lists live as JSON strings and are validated at the service boundary (`utils/json.ts` + zod), which means **moving to Postgres is a one-word change** to `provider` with zero model edits.

**2. `DailyInsight` exists so feedback has something durable to point at.** An insight regenerated on every request would give every 👍 a different `itemIdentifier`, making the votes unjoinable. Persisting `(userId, date) → (prompt, content, model)` means a vote references an exact, reproducible generation — which is the whole point of collecting it (see §11).

`Feedback.contextSnapshot` stores what the user actually saw. A bare `👎 on NEWS` is close to useless six months later; `👎 on NEWS + these 6 headlines + this profile` is a training example.

---

## 7. API reference

All routes are prefixed `/api`. Authenticated routes need `Authorization: Bearer <token>`.
Errors always use one shape: `{ "error": { "code", "message", "details"? } }`.

### Auth

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | `{ email, name, password }` | `201 { token, user }` |
| `POST` | `/auth/login` | `{ email, password }` | `200 { token, user }` |
| `GET` | `/auth/me` | — | `200 { user }` |

Password policy (enforced server-side, mirrored in the UI): ≥ 8 chars, one lowercase, one uppercase, one digit.

### Profile / onboarding

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/profile` | — | `200 { profile \| null }` |
| `PUT` | `/profile` | `{ assets[], archetype, contentTypes[], goal? }` | `200 { profile }` |
| `GET` | `/profile/options` | — | `200 { assets[], archetypes[], contentTypes[] }` |

`/profile/options` is served by the API so the onboarding UI renders **exactly** the values the validator accepts — the question catalog and the schema can't drift apart.

### Dashboard

| Method | Path | Query | Response |
| --- | --- | --- | --- |
| `GET` | `/dashboard/prices` | — | `PricesSection` |
| `GET` | `/dashboard/news` | — | `NewsSection` |
| `GET` | `/dashboard/insight` | `refresh=true` | `InsightSection` |
| `GET` | `/dashboard/meme` | `shuffle=true` | `MemeSection` |
| `GET` | `/dashboard` | — | `{ profile, sections: { prices, news, insight, meme } }` |

Every section returns the same envelope:

```ts
{
  sectionType: 'PRICES' | 'NEWS' | 'INSIGHT' | 'MEME',
  itemIdentifier: string,      // what the feedback widget votes on
  source: 'live' | 'cache' | 'fallback',
  generatedAt: string,         // ISO
  notice: string | null,       // why it degraded, if it did
  data: { … }                  // section-specific payload
}
```

The aggregate `GET /dashboard` uses `Promise.allSettled`, so a dead upstream yields `sections.news === null` rather than a 500. The UI prefers the four individual endpoints so each card can skeleton, error and retry alone.

### Feedback

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `POST` | `/feedback` | `{ sectionType, itemIdentifier, vote, context? }` | `200 { feedback }` (upsert) |
| `DELETE` | `/feedback` | `{ sectionType, itemIdentifier }` | `204` |
| `GET` | `/feedback` | — | `200 { feedback[] }` |
| `GET` | `/feedback/summary` | — | `200 { summary[] }` — per-section up/down tallies |
| `GET` | `/feedback/export` | — | `200 { count, pairs[] }` — `(prompt, completion, label)` rows |

### Health

`GET /api/health` → `200 { status, database, uptimeSeconds, timestamp }`, or `503` when the DB is unreachable. Point your platform's health check here.

### Try it with curl

```bash
TOKEN=$(curl -s localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@moveo.dev","password":"Demo1234!"}' | jq -r .token)

curl -s localhost:4000/api/dashboard/insight -H "Authorization: Bearer $TOKEN" | jq
curl -s localhost:4000/api/feedback -X POST -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"sectionType":"INSIGHT","itemIdentifier":"insight:<id>","vote":"UP"}' | jq
```

---

## 8. Design decisions worth knowing

**Four queries, not one.** The dashboard could fetch one aggregate payload, but then the slowest upstream gates the whole grid and one failure blanks all four cards. Independent TanStack Query hooks give each card its own skeleton, error boundary, retry button and refetch cadence (prices poll every 60s; the insight has `staleTime: Infinity` because it's daily).

**Honest data provenance.** Fallback data is *labelled*, never silently substituted. Showing an invented BTC price with a `Live` badge would be the single worst bug this app could ship, so `source` is part of the API contract and rendered as a badge on every card.

**Deterministic fallbacks.** The static price snapshot and curated meme are seeded from `(symbol|userId, UTC date)` rather than `Math.random()`. A fallback that jitters on every refresh looks broken — and it would break feedback identity, since `itemIdentifier` is derived from the content.

**Types duplicated, not shared.** `client/src/types/api.ts` mirrors `server/src/types/index.ts` verbatim rather than importing a shared workspace package. A shared package needs TS project references and build ordering between a `tsc`-CJS server and a Vite-ESM client; for a contract this size the duplication is cheaper than the build complexity. Both files carry a header pointing at the other. If the contract grew, the right move is codegen (`openapi-typescript` or tRPC), not hand-shared types.

**Timing-safe-ish login.** A missing user is compared against a dummy bcrypt hash so response time doesn't reveal whether an email is registered.

**Auth token in `localStorage`.** Pragmatic for a task with a cross-origin SPA + API. The production-grade answer is an httpOnly, `SameSite=Strict` refresh cookie plus a short-lived in-memory access token, which sidesteps XSS token theft. Called out honestly in §12 rather than hidden.

**Sanitized LLM output.** Free-tier models return markdown, preambles ("Sure! Here's…") and run past their length budget. `sanitizeCompletion()` strips formatting and hard-caps to 3 sentences, so a chatty model can't break the card layout.

---

## 9. Deployment guide

Reference topology: **Vercel** (static SPA) + **Render** (API) + **Render Postgres** (or Supabase/Neon).

### Step 1 — nothing to do

**There is no manual schema edit before deploying.** `server/prisma/schema.prisma` (SQLite) is the single source of truth; the PostgreSQL schema and its migration are generated from it and **already committed**:

```
server/prisma/schema.prisma                              # source of truth (SQLite, local dev)
server/prisma/postgres/schema.prisma                     # generated (PostgreSQL, production)
server/prisma/postgres/migrations/0_init/migration.sql   # generated DDL
server/prisma/postgres/migrations/migration_lock.toml
```

Production scripts point at the generated schema:

| Script | Command |
| --- | --- |
| `build:prod` | `schema:check` → `prisma generate --schema=prisma/postgres/schema.prisma` → `tsc` |
| `db:deploy` | `prisma migrate deploy --schema=prisma/postgres/schema.prisma` |

After changing any model, run `npm run schema:sync && npm run schema:migration -w server` and commit both. `npm run verify` — and `build:prod` — **fail if the two schemas have drifted**, so a forgotten sync can't reach production.

No model changes are ever needed between the two engines: the schema avoids SQLite-only and Postgres-only features on purpose (§6).

### Step 2 — deploy the API to Render

Either commit [`render.yaml`](render.yaml) and use **New + → Blueprint**, or configure manually:

| Setting | Value |
| --- | --- |
| Root directory | `server` |
| Build command | `npm install && npm run build:prod && npm run db:deploy` |
| Start command | `npm run start` |
| Health check path | `/api/health` |

Environment variables to set:

```
NODE_ENV=production
DATABASE_URL=<from your Postgres instance>
JWT_SECRET=<openssl rand -base64 48>
CORS_ORIGIN=https://your-app.vercel.app
OPENROUTER_API_KEY=<optional>
CRYPTOPANIC_API_TOKEN=<optional>
```

> `CORS_ORIGIN` must be the **exact** frontend origin — scheme, host, no trailing slash. Add Vercel preview domains as extra comma-separated entries if you want previews to work.

Seed the demo user once (Render Shell): `npm run db:seed`.

### Step 3 — deploy the SPA to Vercel

| Setting | Value |
| --- | --- |
| Root directory | `client` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

Environment variable:

```
VITE_API_BASE_URL=https://crypto-advisor-api.onrender.com
```

`client/vercel.json` already handles SPA rewrites (so `/dashboard` deep-links resolve) and immutable asset caching. `VITE_*` vars are **baked in at build time** — changing one requires a redeploy, not just a restart.

### Step 4 — verify

```bash
curl https://your-api.onrender.com/api/health
# {"status":"ok","database":"up",…}
```

Then open the Vercel URL, register, complete onboarding, and confirm all four cards render. If cards show `Fallback`, the app is working — you just haven't added that provider's key.

### Railway alternative

Root `server`, build `npm install && npm run build && npx prisma migrate deploy`, start `npm run start`, add the Postgres plugin (it injects `DATABASE_URL`), then set `JWT_SECRET` and `CORS_ORIGIN`.

### Deployment gotchas

- **Render free tier cold starts** (~50s after 15 min idle). The first dashboard load may time out; the client's retry + fallback path handles it, but expect a slow first paint.
- **Free Postgres instances expire** on some plans — check your provider's retention policy before demoing.
- **The in-memory cache is per-process.** Scaling past one instance means each replica keeps its own cache and its own upstream quota consumption. Swap `lib/cache.ts` for Redis (`ioredis`) at that point — the `withCache` signature is storage-agnostic precisely so this is a one-file change.
- **Rate limiting is also in-memory** (`express-rate-limit` default store) and has the same multi-instance caveat.

---

## 10. AI tool interaction log

This section documents how AI was actually used to build this task, including where it was wrong.

### Tooling

| Tool | Role |
| --- | --- |
| **Claude Code (Opus)** in an agentic terminal loop | Primary implementation: scaffolding, all backend/frontend code, schema, README |
| Provider docs (CoinGecko / CryptoPanic / OpenRouter / meme-api) | Verified request shapes and response fields rather than trusting recalled API surfaces |

### How the work was actually driven

**1. Contract-first, not screen-first.** The first file written after the toolchain config was `server/src/types/index.ts`. Fixing the API envelope (`SectionEnvelope<T>` with `sectionType` / `itemIdentifier` / `source` / `notice`) *before* any service or component meant the four cards, the four services and the feedback table all agreed by construction instead of being reconciled later. This single decision removed most of the integration churn a four-integration dashboard would normally produce.

**2. The requirements were read as constraints on the data model.** "Persist the vote to a `Feedback` table (`userId`, `sectionType`, `itemIdentifier`, `vote`)" implies something the spec doesn't say out loud: `itemIdentifier` must be **stable**. That forced two designs the brief never mentioned — the `DailyInsight` table (so an insight has a durable id to vote on) and date-seeded deterministic fallbacks (so a rate-limited price card doesn't change identity on every refresh). Working backwards from "will this vote still be joinable in six months?" produced a better schema than implementing the sentence literally.

**3. Failure paths were designed alongside happy paths.** Every service was written with its degradation strategy in the same pass — `withCache` (fresh → stale → curated) exists because four free-tier APIs *will* fail during a demo. The `source` field was added to the API contract rather than kept server-side, because the honest UX requirement ("don't show fake prices as live") is a contract concern, not a rendering detail.

### Where AI output needed correcting

These are real fixes made during this build, not a hypothetical list:

| Issue | Why it was wrong | Fix |
| --- | --- | --- |
| `jwt.sign(payload, secret, { expiresIn: env.JWT_EXPIRES_IN })` | `@types/jsonwebtoken@9` types `expiresIn` as a narrow literal union, not `string`. A config-driven duration fails to compile. | Widened once, in one place: `expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']` |
| First `shuffleMeme()` wrote `null` into the cache to force a refetch | Poisoned the cache with a value that could be served as a meme, and the read-back logic was nonsense. | Rewrote as `invalidateCache(key)` + re-run |
| `profile.upsert({ update: { completedAt: { set: undefined } } })` | A convoluted no-op to "preserve" the original timestamp. Confusing, and didn't cover rows where it was never set. | Omit the field on update; explicitly backfill when `completedAt` is null |
| `noUncheckedIndexedAccess` violations | `units[0]`, `series[i]`, destructuring array heads are all `T \| undefined` under this flag. Easy to write, doesn't compile. | Restructured (named `smallest` constant) or `?? 0` fallbacks — not blanket `!` assertions |
| `.link { @apply hover:text-brand-300 }` | `brand-300` wasn't in the Tailwind palette. Unknown utilities inside `@apply` are a **build error**, not a silent no-op. | Added `brand.300` to the theme |
| `<Button asChild={false} onClick={() => window.location.assign('/onboarding')}>` | `asChild` isn't a prop on this Button (type error), and a full page reload inside an SPA throws away all client state. | `useNavigate()` |
| `Object.assign(req, { query: parsed })` in the validation middleware | Express defines `req.query` as a **prototype getter with no setter**, so `Object.assign` throws a `TypeError` at runtime — and only on the query-validated routes, so it would have looked like a flaky endpoint. | `Object.defineProperty(req, target, { value, writable: true, … })` to shadow the getter |
| Client split into `tsconfig.app.json` + `tsconfig.node.json` with `tsc -b` project references | Copied from muscle memory of the Vite template. Referenced projects need `composite: true`, which has conflicted with `noEmit` across TS versions — a coin-flip on whether `npm run build` works at all. | Collapsed to one non-composite `tsconfig.json`; Vite transpiles, `tsc --noEmit` only type-checks |

The pattern: AI drafts *plausible* code fast, and the failures cluster in **third-party type surfaces** (`@types/jsonwebtoken`, Prisma's update operators, Tailwind's `@apply`) and in **strict-mode edge cases** — exactly the places where "looks right" and "compiles and behaves" diverge. Reviewing generated code specifically at those boundaries caught far more than reading it top-to-bottom would.

### Verification actually performed

The whole codebase was written before Node.js was available in the environment, so for a while none of it had been executed. Node 26 was then installed and everything below was run for real:

| Check | Result |
| --- | --- |
| `npm install` (workspaces) | 286 packages. npm 11 now **blocks install scripts by default** — Prisma engines and esbuild binaries need approving via `npm install-scripts approve @prisma/client prisma @prisma/engines esbuild`, which writes the `allowScripts` block in the root `package.json`. Without it, `prisma generate` and `vite build` fail. |
| `npm run typecheck` | Clean on both workspaces under full strict mode (`noUncheckedIndexedAccess`, `noImplicitReturns`, `noUnusedLocals`). |
| `npm run build` | Server `tsc` clean; client 1647 modules → 263 kB JS (81 kB gzip), 24 kB CSS. |
| `db:push` + `db:seed` | SQLite schema created, demo user seeded idempotently. |
| All 4 sections | Prices **live** from CoinGecko (real BTC/ETH/SOL data + sparklines), meme **live** from meme-api. News and insight correctly returned `source: "fallback"` with the right `notice`, since no API keys were set. |
| Personalization | Verified two profiles produce different output: the HODLer got "Nothing here changes a long-term thesis…", the Day Trader got "Watch whether that leader holds its gain into the next session…", each over only their own assets. |
| Feedback | Upsert verified: re-voting UP→DOWN reused the same row id and bumped `updatedAt` (no duplicate). Summary tallied correctly, `DELETE` returned 204 and emptied the list, and `/feedback/export` returned the vote joined to the full stored prompt + completion. |
| Cascade deletes | Deleting a user removed their `Feedback` and `DailyInsight` rows. |
| Error paths | 422 with per-field details on weak passwords and bad enum values, 409 on duplicate email, 401 on missing/garbage token, 404 on unknown route. |
| Vite dev proxy | `localhost:5173/api/health` correctly proxied to the API — no CORS in dev, as designed. |
| **Full UI walkthrough (headless Chrome)** | 13-step Playwright run through the real browser: root → `/login` redirect, register with live password-rule feedback, **new user routed to onboarding**, Continue correctly disabled until an asset is picked, all 3 onboarding steps, dashboard renders all 4 cards out of their loading state, profile chips match the answers, price card shows exactly the 2 chosen assets, 👍 flips `aria-pressed` **and is confirmed present in the DB via the API**, the vote **survives a full page reload**, meme shuffle returns a new image, sign-out redirects, and `/dashboard` is blocked once logged out. **0 console errors, 0 page exceptions, 0 failed requests.** |

**Two real defects were found only by looking at a screenshot**, after every structural assertion had already passed:

1. **Curated news rendered "2y ago".** The fallback digest had hardcoded `2025-01-06` timestamps, so as soon as the calendar moved on it read as stale, broken data. Fixed by making the curated articles carry a relative `hoursAgo` and materialising `publishedAt` against the current hour — accurate, since those headlines are deliberately evergreen.
2. **The meme card collapsed into a large void.** The image container had no reserved height, so a slow (`loading="lazy"`) or failed image dropped the card's height to nothing while the grid stretched it to match the News card. Fixed with `min-h-52` on the container and dropping lazy-loading for what is a single, near-the-fold hero image.

Neither was reachable by type-checking or DOM assertions — they needed a human (or a model) to actually *look* at the rendered page.

**Two real runtime bugs were caught only by executing it**, not by type-checking — both listed in the table above (`Object.assign(req.query)` and the `tsc -b`/`composite` mismatch). That is the argument for running the thing: strict TypeScript proved the *shapes* were right, and said nothing about Express's prototype getters.

**Still not verified:** no committed automated test suite (the Playwright walkthrough above was run from a scratch directory, not checked in — see §12), and nothing has been deployed to a live host yet.

---

## 11. Bonus: turning feedback into continuous learning

Right now each 👍/👎 writes one row. That row is only *training data* if it captures enough context to be replayed — which is why `Feedback` stores `contextSnapshot`, and `DailyInsight` stores the exact `prompt` sent upstream. Together they give a replayable `(state, prompt, completion, human label)` tuple. This section proposes how to exploit that, cheapest-first.

### Stage 0 — instrument before you train (weeks 0–2)

Nothing below works without volume and honesty about what a vote means. First:

- **Log implicit signals too.** Explicit thumbs are sparse and biased toward extremes. Dwell time per card, news link click-through, meme shuffle rate and "regenerate insight" clicks are 10–100× denser. A `regenerate` click is a soft 👎 that costs the user nothing to give.
- **Separate the four sections.** A 👎 on MEME means "not funny"; a 👎 on PRICES probably means "wrong assets"; a 👎 on INSIGHT means "generic / wrong / not for me". Pooling them into one reward signal trains a model to average four unrelated objectives. Only **INSIGHT** feedback is directly usable for language-model learning; the other three are *retrieval and ranking* signals.
- **Define the counterfactual.** A vote labels one shown item. Without knowing what *else* could have been shown, you have a bandit-with-one-arm. Log the candidate set (which headlines were available, which weren't chosen) to make later off-policy evaluation possible.

**Target dataset shape** — `GET /api/feedback/export` already emits a first cut of this:

```jsonc
{
  "user_id": "clx…",              // hashed before it leaves the DB
  "section": "INSIGHT",
  "item_id": "insight:clx…",
  "prompt": "DATE (UTC): 2026-08-25\nREADER PROFILE\n- Investor type: HODLer…",
  "completion": "Today 2 of 3 of your assets are up: SOL leads at +3.10%…",
  "label": "UP",
  "profile": { "archetype": "HODLER", "assets": ["BTC","ETH","SOL"] },
  "market_state": { "BTC": { "change24h": -0.4 }, … },
  "implicit": { "dwell_ms": 8200, "regenerated": false },
  "created_at": "2026-08-25T09:12:00Z"
}
```

### Stage 1 — few-shot prompt injection (days, ~100 votes)

The highest-return, lowest-risk move, and it needs no training infrastructure.

At insight-generation time, retrieve that user's (or their archetype cohort's) recent 👍 insights and inject 2–3 as exemplars, plus one 👎 as an explicit negative constraint:

```
Examples this reader rated positively:
- "SOL leads your watchlist at +3.1% while ADA lags at -0.8%. For a long-term
   holder that spread is noise, not signal — worth watching only if it persists."

Avoid this style, which they rated negatively:
- "The crypto market is showing mixed signals today. Investors should stay
   informed and consider their risk tolerance."   ← generic, no numbers
```

This adapts tone, specificity and length per user within a single request. Cold-start is solved by falling back to the archetype's cohort exemplars. Cost: one extra DB query and ~200 prompt tokens. Guardrail: cap exemplars at 3 and truncate them, or the prompt drifts toward reproducing old insights verbatim.

### Stage 2 — reward model + DPO (months, ~5–10k labelled pairs)

**Why DPO over classic RLHF/PPO.** Preference optimization ([Rafailov et al., 2023](https://arxiv.org/abs/2305.18290)) trains directly on `(prompt, chosen, rejected)` triples with a simple classification-style loss — no separate reward model to serve, no PPO rollout loop, far less compute and far fewer moving parts. For a single-objective, single-team product this is the right default; PPO only earns its complexity when you need online exploration.

**The hard part is manufacturing pairs**, because production only ever shows one completion per prompt. Three sources, roughly in order of quality:

1. **Regeneration pairs (best).** When a user clicks "Regenerate", we have two completions for a near-identical prompt. If they 👎 the first and 👍 the second, that's a clean `(chosen, rejected)` pair with the confound of "different market state" almost eliminated. **This is the single strongest argument for keeping the regenerate button** — it's a preference-data collection mechanism disguised as a UX affordance.
2. **Shadow generation.** For each real request, sample a second completion offline at higher temperature and store it unshown. When the shown one gets a vote, pair them — the vote gives the shown one's polarity, and a reward model or LLM-judge ranks the pair.
3. **Cross-user matching.** Cluster prompts by `(archetype, asset set, market regime)`; within a cluster, pair a 👍 completion against a 👎 one. Weakest signal — different users, different market days — so weight these lowest.

**Pipeline:**

```
Feedback + DailyInsight
   └─▶ nightly ETL ──▶ pair mining ──▶ dedup + PII scrub ──▶ preference set
                                                                  │
                          ┌───────────────────────────────────────┤
                          ▼                                       ▼
                  DPO on a 7B base                     reward model (optional,
                  (LoRA, ~1-2 GPU-hours)                for online reranking)
                          │
                          ▼
                  offline eval vs held-out pairs
                  (pairwise win-rate + LLM-as-judge)
                          │
                    win-rate > baseline + margin?
                          │
                          ▼
                  shadow deploy ──▶ A/B (5% → 50%) ──▶ promote
```

**Sample-efficiency note:** a LoRA adapter on Mistral-7B fine-tunes usefully from ~1–5k good pairs; full-parameter DPO wants an order of magnitude more. With this app's likely volume, LoRA is the only realistic option — and it keeps the base model swappable.

**Eval discipline.** Never promote on training loss. Hold out the most recent 2 weeks of pairs (temporal split, not random — random splits leak market regime across the boundary), measure pairwise win-rate against the incumbent, and gate on a *live* metric that isn't the training objective: 👍 rate, or regenerate-rate as a proxy for dissatisfaction.

### Stage 3 — feedback beyond the LLM

Three of the four sections aren't generation problems, and treating them as such wastes the signal:

| Section | What a vote actually means | Right mechanism |
| --- | --- | --- |
| **PRICES** | "wrong assets / wrong layout" | Nudge the profile — suggest adding a co-held asset, or reorder rows by engagement. Not a model problem. |
| **NEWS** | "irrelevant / stale / low quality" | **Learning-to-rank.** Embed articles, embed the profile, train a lightweight ranker (LambdaMART or a two-tower model) on votes + click-through. Recommendation embeddings fine-tuned on 👍 pairs via contrastive loss are the natural fit here. |
| **MEME** | "not funny / seen it / wrong vibe" | Contextual bandit over subreddits (Thompson sampling). Per-user posterior over sources; converges in tens of interactions, no training run needed. |
| **INSIGHT** | "generic / wrong / not for me" | Stages 1–2 above. |

### Risks to design against

- **Feedback loops.** Training on what users engaged with, then showing more of it, narrows the distribution until the product only confirms priors. Reserve an ε-fraction of slots for exploration and monitor content diversity as a first-class metric.
- **Sycophancy.** Optimizing 👍 on financial commentary selects for *agreeable* insights, not *accurate* ones — a model that always says "your bags are fine" will win on thumbs and lose users money. Any reward signal here needs a factuality gate (do the cited numbers match the price data we actually fetched?) that a human vote cannot override.
- **Reward hacking.** Hedged, unfalsifiable prose ("markets may move either way") is hard to downvote. Penalize low-specificity output explicitly — e.g. require ≥1 concrete number, which the current prompt already asks for and which is cheap to verify post-hoc.
- **Sparse-and-biased labels.** Votes come disproportionately from delighted and furious users. Reweight by user activity, and never treat absence of a vote as a negative.
- **Privacy.** Prompts embed the user's assets, archetype and free-text goal — that is financial PII. Hash user ids, strip `goal` before any export leaves the DB, require explicit opt-in consent for training use, and support deletion propagating into future training sets (a shipped adapter can't be un-trained; document that retention window).

### Minimum viable next commit

If only one thing ships from this section: log implicit signals (dwell, click-through, regenerate) next to the explicit votes, and turn on Stage 1 few-shot injection. That's a few hundred lines, needs no GPU, and produces the volume Stage 2 requires.

---

## 12. Known limitations & next steps

Honest inventory rather than a feature list.

**Not verified**
- **No committed test suite.** The API is verified via curl and the UI via a 13-step headless-Chrome walkthrough (§10), but neither is checked into the repo, so nothing guards against regressions. `app.ts` is exported separately from `index.ts` specifically so `supertest` can mount it without binding a port; the Playwright script should be moved into `client/e2e/` and wired to CI. Highest-value unit/integration tests: auth round-trip, feedback upsert idempotency, and `withCache` serving stale data on upstream failure.

**Security**
- JWT in `localStorage` (§8) — swap for an httpOnly refresh cookie + in-memory access token before real users.
- No refresh-token rotation, email verification, or password reset.
- Rate limiting and caching are both in-memory, so both are per-instance.

**Product**
- Onboarding preferences drive personalization, but `contentTypes` currently only shapes the AI prompt's tone; it should also reorder/hide cards.
- No pagination on news, no historical charts beyond the 7-day sparkline, no portfolio tracking.
- `/feedback/export` is scoped to the caller. A real training pipeline needs an admin-gated global export behind a consent flag.

**Ops**
- No structured request tracing, no metrics endpoint, no error reporting (Sentry).
- `Feedback` and `DailyInsight` grow unboundedly; needs a retention policy.

---

<p align="center"><sub>Built for the Moveo coding task · market data from CoinGecko &amp; CryptoPanic · insights are AI-generated and not financial advice</sub></p>
