import { notFound } from "next/navigation";
import { requireHousehold } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RecipeForm, type RecipeFormValues } from "@/components/recipes/recipe-form";

export default async function EditRecipePage({ params }: { params: { id: string } }) {
  const { householdId } = await requireHousehold();
  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: { ingredients: true },
  });
  if (!recipe || recipe.householdId !== householdId) notFound();

  const initial: RecipeFormValues = {
    title: recipe.title,
    sourceUrl: recipe.sourceUrl ?? "",
    instructions: recipe.instructions ?? "",
    notes: recipe.notes ?? "",
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    tags: recipe.tags,
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      category: i.category,
      estimatedCalories: i.estimatedCalories,
      estimatedProteinG: i.estimatedProteinG,
      estimatedCarbsG: i.estimatedCarbsG,
      estimatedFatG: i.estimatedFatG,
    })),
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Edit recipe</h1>
      <RecipeForm initial={initial} recipeId={recipe.id} />
    </div>
  );
}
