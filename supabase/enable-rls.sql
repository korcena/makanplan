-- Enable Row Level Security on all tables.
-- The app accesses data exclusively through Prisma (which connects as the
-- postgres superuser and bypasses RLS).  Enabling RLS with no permissive
-- policies means the anon / authenticated PostgREST roles cannot read or
-- write any data directly — all access must go through the Next.js API routes.

ALTER TABLE "User"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Household"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recipe"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecipeIngredient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MealPlan"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarNote"     ENABLE ROW LEVEL SECURITY;
