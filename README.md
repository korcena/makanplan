# MakanPlan

A household meal-planner web app: share a recipe repository, plan meals on a
calendar, generate shopping lists, and see daily macro estimates.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma + PostgreSQL
- NextAuth (credentials, bcrypt)
- Cheerio for URL scraping, Claude API for recipe parsing
- `@dnd-kit` for calendar drag & drop

## Getting started

```bash
# 1. install deps (triggers prisma generate)
npm install

# 2. configure env
cp .env.example .env
# edit DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY

# 3. set up database
npm run db:push        # or: npm run db:migrate

# 4. seed sample data
npm run db:seed
# Demo login: test@makanplan.com / password123

# 5. dev
npm run dev
```

## Features

- Auth: register / login with NextAuth credentials provider
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

- `DATABASE_URL` — Postgres connection string
- `NEXTAUTH_SECRET` — long random string
- `NEXTAUTH_URL` — e.g. `http://localhost:3000`
- `ANTHROPIC_API_KEY` — required for text/URL recipe parsing features
