import Link from "next/link";
import { notFound } from "next/navigation";
import { requireHousehold } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Pencil, ExternalLink } from "lucide-react";
import { sumIngredientMacros, scaleMacros, round1 } from "@/lib/macro-calculator";
import { RecipeActions } from "./recipe-actions";
import { AddToPlanButton } from "./add-to-plan-button";

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
  const { householdId } = await requireHousehold();
  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: { ingredients: true, createdBy: true },
  });
  if (!recipe || recipe.householdId !== householdId) notFound();

  const total = sumIngredientMacros(recipe.ingredients);
  const perServing = scaleMacros(total, 1 / Math.max(1, recipe.servings));
  const totalMin = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold break-words">{recipe.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" /> {recipe.servings} servings
            </span>
            {totalMin > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {totalMin} min
              </span>
            )}
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> Source
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-3">
            {recipe.tags.map((t) => (
              <Badge key={t} variant="soft">
                {t}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <AddToPlanButton recipeId={recipe.id} defaultServings={recipe.servings} />
          <Button variant="outline" asChild>
            <Link href={`/recipes/${recipe.id}/edit`}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Link>
          </Button>
          <RecipeActions recipeId={recipe.id} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="flex gap-2">
                  <span className="font-medium shrink-0 tabular-nums">
                    {formatQty(ing.quantity)} {ing.unit}
                  </span>
                  <span className="flex-1">{ing.name}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {recipe.instructions || <span className="text-muted-foreground">No instructions.</span>}
            </div>
            {recipe.notes && (
              <div className="mt-6 p-3 rounded-md bg-accent text-sm">
                <div className="font-semibold mb-1">Notes</div>
                <p className="whitespace-pre-wrap">{recipe.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Macros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 text-center">
            <MacroBox label="Calories" value={round1(total.calories)} unit="kcal" per={round1(perServing.calories)} />
            <MacroBox label="Protein" value={round1(total.proteinG)} unit="g" per={round1(perServing.proteinG)} />
            <MacroBox label="Carbs" value={round1(total.carbsG)} unit="g" per={round1(perServing.carbsG)} />
            <MacroBox label="Fat" value={round1(total.fatG)} unit="g" per={round1(perServing.fatG)} />
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Macros are estimates and may vary.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MacroBox({ label, value, unit, per }: { label: string; value: number; unit: string; per: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">
        {value} <span className="text-sm font-normal">{unit}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {per} {unit}/serving
      </div>
    </div>
  );
}

function formatQty(q: number): string {
  if (!Number.isFinite(q)) return "";
  const rounded = Math.round(q * 100) / 100;
  return rounded.toString();
}
