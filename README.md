# YAZ

An AI-powered personal fashion search app. Describe a piece in your own words and
YAZ searches real European online shops, filtered to your size, style, and budget.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS + shadcn/ui**,
**Supabase** (Postgres + Auth), and the **Anthropic API** (`claude-haiku-4-5-20251001`)
with the `web_search_20250305` tool.

## Features

- Email/password auth (Supabase) with a protected-route middleware
- 4-step onboarding wizard (about you → measurements → style → preferences)
- Editable profile (sizes, body shape, style tags, fabrics, budget, notes)
- AI search: a stylist system prompt + live web search returns up to 8 real products
- Save/remove favorites, sortable favorites page
- Editorial, minimal design system (muted sage accent, no shadows, 8px radius)

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (server-only) |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/ |

Optional: `ANTHROPIC_MODEL` overrides the default model id (`claude-sonnet-4-6`).

### 3. Set up the database

Run the SQL in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
against your Supabase project — either paste it into the **SQL Editor**, or with the
Supabase CLI:

```bash
supabase db push
```

This creates the `profiles` and `favorites` tables, enables Row Level Security
(users can only read/write their own rows), and adds a trigger that auto-creates a
profile row on signup.

> **Auth note:** for the smoothest local experience, disable "Confirm email" in
> Supabase → Authentication → Providers → Email. With it on, new users must confirm
> via the emailed link (handled by `/auth/callback`) before signing in.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000 — you'll be routed to `/auth`, then through onboarding,
then to `/search`.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run typecheck` — `tsc --noEmit`

## Project structure

```
app/
  auth/            Sign in / create account (+ /auth/callback)
  onboarding/      4-step profile wizard
  search/          Main search page (sidebar + results grid)
  favorites/       Saved items
  profile/         Edit profile
  api/search/      AI search route (Anthropic + web search)
components/        UI + feature components (components/ui = shadcn)
lib/
  supabase/        Browser, server, and middleware clients
  types.ts         Hand-written DB types (mirror the migration)
  style-tags.ts    Hardcoded style tags, sizes, body shapes, budget
  search-prompt.ts System prompt builder + response parsing
supabase/migrations/  SQL schema
```
