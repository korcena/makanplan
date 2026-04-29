# MakanPlan

A household meal-planner web app built with Next.js. Share a recipe repository
with your household, plan meals on a drag-and-drop calendar, auto-generate
shopping lists, and track daily macro estimates — all powered by AI-assisted
recipe parsing.

## Features

### Recipes

- **Manual entry** — full form with title, ingredients, instructions, notes,
  servings, prep/cook times, and tags
- **Paste raw text** — paste any recipe text and Claude AI parses it into
  structured ingredients, steps, and macros
- **Import from URL** — scrapes the page for JSON-LD recipe schema first, falls
  back to AI parsing
- **AI macro estimation** — auto-estimates calories, protein, carbs, and fat per
  ingredient; also available as a manual "Estimate macros" button
- **Search & filter** — find recipes by title, ingredient name, or tag
- **Per-ingredient nutrition** — each ingredient stores estimated macros with
  per-recipe and per-serving totals on the detail page

### Meal Calendar

- **Week view** with breakfast, lunch, dinner, and snack slots
- **Configurable week start** — choose Monday or Sunday; the setting is global
  and respected by the calendar, shopping list, and macros pages (persisted in
  localStorage)
- **Multiple recipes per slot** — add mains, sides, appetisers, and desserts to
  the same meal
- **Drag & drop** — move meals between slots and days
- **Copy & paste meals** — duplicate a meal to another slot
- **Leftovers** — copy a meal as a leftover (amber colour, excluded from
  shopping list so you don't buy ingredients you already have)
- **Calendar notes** — add, edit, and delete text notes per cell (blue cards)
- **Colour-coded items** — meals (gray), leftovers (amber), notes (blue) with a
  legend at the top
- **Persistent week** — last-viewed week is remembered across navigations
- **Recipe picker modal** — searchable recipe list with custom serving count

### Shopping List

- **Auto-generated** from planned meals over a configurable date range (leftovers
  are excluded automatically)
- **Grouped by category** — produce, dairy, meat, seafood, pantry, frozen,
  bakery, beverages, other
- **Unit consolidation** — aggregates quantities across recipes
- **Interactive checklist** — check off items as you shop (persisted in
  localStorage)
- **Quick actions** — check/uncheck all, copy to clipboard, print-friendly view
- **Preset ranges** — "This week" and "Next week" buttons (respects global week
  start day)

### Macros & Nutrition

- **Daily dashboard** — total calories, protein, carbs, and fat for any day
- **Per-slot breakdown** — colour-coded calorie bars for each meal slot
- **Weekly chart** — 7-day stacked bar chart showing daily calorie distribution
  (respects global week start day)
- **Click any day** to drill into its breakdown

### Households

- **Create or join** a household with a shareable invite code
- **Shared data** — all recipes, meal plans, and shopping lists are
  household-scoped
- **Member management** — owner can rename household, regenerate invite code,
  remove members, or transfer ownership
- **Role-based access** — owner vs. member permissions

### Authentication & Accounts

- **Supabase Auth** — email and password registration/login
- **Account settings** — update display name or change password
- **Delete account** — permanently delete your account with double confirmation;
  if you're the last household member, the household and all its data are deleted
- **Protected routes** — middleware-based session refresh and route guarding

## Tech Stack

| Layer         | Technology                                           |
| ------------- | ---------------------------------------------------- |
| Framework     | Next.js 14 (App Router) + TypeScript                 |
| Styling       | Tailwind CSS + Radix UI primitives                   |
| Database      | Supabase Postgres + Prisma ORM                       |
| Auth          | Supabase Auth via `@supabase/ssr`                    |
| AI            | Claude API (recipe parsing + macro estimation)       |
| Scraping      | Cheerio (JSON-LD extraction from recipe URLs)        |
| Drag & drop   | `@dnd-kit`                                           |
| Validation    | Zod (API input validation)                           |
| Icons         | Lucide React                                         |
| Date handling | date-fns                                             |

## Getting Started

```bash
# 1. Install dependencies (triggers prisma generate)
npm install

# 2. Configure environment
cp .env.example .env
# Fill in the Supabase values (see below)

# 3. Push the schema to your Supabase database
npm run db:push

# 4. (Optional) Seed sample data
#    Requires SUPABASE_SERVICE_ROLE_KEY so the seed can create the demo auth user.
npm run db:seed
# Demo login: test@makanplan.com / password123

# 5. Enable Row Level Security (run once via Supabase SQL Editor)
#    Open supabase/enable-rls.sql and execute it in the SQL Editor.
#    This locks down PostgREST so only the app's API routes can access data.

# 6. Start dev server
npm run dev
```

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and **anon key** into `NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. From **Settings > Database > Connection string**, copy the **Transaction
   pooler** string into `DATABASE_URL` and the **Session pooler** (or direct
   5432) string into `DIRECT_URL`. The app uses the pooled URL at runtime;
   Prisma uses the direct URL for migrations.
4. Copy the **service role key** into `SUPABASE_SERVICE_ROLE_KEY` if you want
   to run `npm run db:seed`. Never expose this key to the browser.
5. In **Authentication > Providers**, make sure Email is enabled. For local dev
   you can disable "Confirm email" to skip the confirmation step.

## Environment Variables

See `.env.example` for the full list.

| Variable                         | Required | Description                                 |
| -------------------------------- | -------- | ------------------------------------------- |
| `DATABASE_URL`                   | Yes      | Supabase Postgres pooled connection string  |
| `DIRECT_URL`                     | Yes      | Supabase Postgres direct connection string  |
| `NEXT_PUBLIC_SUPABASE_URL`       | Yes      | Supabase project URL                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Yes      | Supabase anon (public) key                  |
| `SUPABASE_SERVICE_ROLE_KEY`      | Seed/Del | Service role key (seed + account deletion)  |
| `ANTHROPIC_API_KEY`              | Yes      | Claude API key for recipe parsing and macros|

## Project Structure

```
app/
  (app)/          # Authenticated pages (dashboard, calendar, recipes, macros, shopping-list, account, household)
  (auth)/         # Public pages (login, register, callback)
  api/            # API routes (recipes, meal-plans, calendar-notes, shopping-list, macros, household, account)
  icon.tsx        # App favicon
components/
  ui/             # Reusable UI primitives (button, card, dialog, input, etc.)
  layout/         # App shell (sidebar, mobile nav, providers)
  calendar/       # Recipe picker modal
  recipes/        # Recipe form
lib/
  supabase/       # Supabase client helpers (browser, server, middleware)
  prisma.ts       # Prisma client singleton
  recipe-parser.ts    # Claude-powered recipe text parser
  url-scraper.ts      # URL scraper with JSON-LD + AI fallback
  macro-calculator.ts # Nutrition calculation utilities
  session.ts      # Auth session helpers
  api-auth.ts     # API route auth guards
prisma/
  schema.prisma   # Database schema
  seed.ts         # Demo data seeder
```
