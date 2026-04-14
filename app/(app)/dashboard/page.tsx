import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarDays, ShoppingCart, ChefHat, Sparkles } from "lucide-react";
import { startOfWeek, endOfWeek } from "date-fns";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user.householdId) {
    return (
      <div className="container max-w-3xl py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" /> Welcome to MakanPlan
            </CardTitle>
            <CardDescription>Create or join a household to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/household">Set up household</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [recipeCount, plansThisWeek, household] = await Promise.all([
    prisma.recipe.count({ where: { householdId: user.householdId } }),
    prisma.mealPlan.count({
      where: {
        householdId: user.householdId,
        date: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.household.findUnique({ where: { id: user.householdId } }),
  ]);

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hi {user.name?.split(" ")[0] ?? "there"}!</h1>
        <p className="text-muted-foreground">
          {household?.name ? `${household.name} · ` : ""}Here&apos;s your kitchen at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recipes</CardDescription>
            <CardTitle className="text-3xl">{recipeCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/recipes">View recipes</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Meals planned this week</CardDescription>
            <CardTitle className="text-3xl">{plansThisWeek}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/calendar">Open calendar</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Shopping list</CardDescription>
            <CardTitle className="text-3xl">This week</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/shopping-list">Generate</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Add a recipe
            </CardTitle>
            <CardDescription>Paste text or a URL — we&apos;ll parse it for you.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href="/recipes/new">New recipe</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/recipes">Browse</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Plan your week
            </CardTitle>
            <CardDescription>Assign recipes to breakfast, lunch, dinner, or snack.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href="/calendar">Open calendar</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/shopping-list">
                <ShoppingCart className="h-4 w-4 mr-1" /> Shopping list
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
