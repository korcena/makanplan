# MakanPlan

A household meal-planner web app: share a recipe repository, plan meals on a
calendar, generate shopping lists, and see daily macro estimates.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase Postgres + Prisma
- Supabase Auth (email + password, via `@supabase/ssr`)
- Cheerio for URL scraping, Claude API for recipe parsing
- `@dnd-kit` for calendar drag & drop

## Getting started

```bash
# 1. install deps (triggers prisma generate)
npm install

# 2. configure env
cp .env.example .env
# fill in the Supabase values (see below)

# 3. push the schema to your Supabase database
npm run db:push        # or: npm run db:migrate

# 4. (optional) seed sample data
#    Requires SUPABASE_SERVICE_ROLE_KEY so the seed can create the demo auth user.
npm run db:seed
# Demo login: test@makanplan.com / password123

# 5. dev
npm run dev
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `Project URL` and `anon` key into `NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. From **Settings → Database → Connection string**, copy the **Transaction
   pooler** string into `DATABASE_URL` and the **Session pooler** (or direct
   5432) string into `DIRECT_URL`. The app uses the pooled URL; Prisma uses
   the direct URL for migrations.
4. Copy the **service role** key into `SUPABASE_SERVICE_ROLE_KEY` if you want
   to run `npm run db:seed`. Never expose this key to the browser.
5. In **Authentication → Providers**, make sure Email is enabled. For local
   dev you can disable "Confirm email" to skip the confirmation step.

## Features

- Auth: register / login with Supabase Auth (email + password)
- Households: create, join with invite code, transfer ownership, remove members
- Recipes:
  - Manual entry with ingredient-level macros
  - Paste raw text — parsed by Claude into a structured recipe
  - Import from URL: JSON-LD recipe schema preferred, falls back to Claude
- Calendar: week view with breakfast/lunch/dinner/snack slots, drag & drop
- Shopping list: aggregate ingredients over a date range, categorised, with
  persistent checked state stored per range in `localStorage`
- Macros: daily totals, per-slot calorie bars, 7-day stacked chart

## Environment variables

See `.env.example`.

- `DATABASE_URL` — Supabase Postgres pooled (transaction) connection string
- `DIRECT_URL` — Supabase Postgres direct connection string (for migrations)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — **seed only**, needed by `prisma/seed.ts`
- `ANTHROPIC_API_KEY` — required for text/URL recipe parsing features
