# DRIP

A personal fashion search app. Describe a piece in your own words and DRIP
sends you straight to that search on every shop it covers — always live, so
what you see is always in stock.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS + shadcn/ui**,
and **Supabase** (Postgres + Auth).

## Features

- Email/password auth (Supabase) with a protected-route middleware
- 4-step onboarding wizard (about you → measurements → style → preferences)
- Editable profile (sizes, body shape, style tags, fabrics, budget, notes)
- Search: one query fans out into direct search-results links across the shop
  list (H&M, Zara, ASOS, Oh Polly, Club L London, Massimo Dutti, Mango,
  Meshki, COS, House of CB, Sézane, Toteme, Loulou de Saison, Uniqlo) — no AI
  call, no stock guessing, zero per-search cost
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
  search/          Main search page (sidebar + shop search-link grid)
  favorites/       Saved items
  profile/         Edit profile
components/        UI + feature components (components/ui = shadcn)
lib/
  supabase/        Browser, server, and middleware clients
  types.ts         Hand-written DB types (mirror the migration)
  style-tags.ts    Hardcoded style tags, sizes, body shapes, budget
  shops.ts         Shop list + per-shop search-URL builders
supabase/migrations/  SQL schema
```
