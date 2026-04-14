import Link from "next/link";
import { requireHousehold } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RecipesList } from "./recipes-list";

export default async function RecipesPage() {
  const { householdId } = await requireHousehold();
  const recipes = await prisma.recipe.findMany({
    where: { householdId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      tags: true,
      servings: true,
      prepTimeMinutes: true,
      cookTimeMinutes: true,
      ingredients: { select: { name: true } },
    },
  });

  const tagSet = new Set<string>();
  recipes.forEach((r) => r.tags.forEach((t) => tagSet.add(t)));

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-bold">Recipes</h1>
          <p className="text-sm text-muted-foreground">Shared across your household.</p>
        </div>
        <Button asChild>
          <Link href="/recipes/new">
            <Plus className="h-4 w-4 mr-1" /> Add recipe
          </Link>
        </Button>
      </div>
      <RecipesList recipes={recipes} allTags={Array.from(tagSet).sort()} />
    </div>
  );
}
