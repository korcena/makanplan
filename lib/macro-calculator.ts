import type { MealSlot, RecipeIngredient } from "@prisma/client";

export type MacroTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export const zeroMacros: MacroTotals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export function sumIngredientMacros(ings: RecipeIngredient[]): MacroTotals {
  return ings.reduce<MacroTotals>(
    (acc, i) => ({
      calories: acc.calories + (i.estimatedCalories ?? 0),
      proteinG: acc.proteinG + (i.estimatedProteinG ?? 0),
      carbsG: acc.carbsG + (i.estimatedCarbsG ?? 0),
      fatG: acc.fatG + (i.estimatedFatG ?? 0),
    }),
    { ...zeroMacros }
  );
}

export function scaleMacros(m: MacroTotals, factor: number): MacroTotals {
  return {
    calories: m.calories * factor,
    proteinG: m.proteinG * factor,
    carbsG: m.carbsG * factor,
    fatG: m.fatG * factor,
  };
}

export function addMacros(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
  };
}

export type MealPlanForMacros = {
  slot: MealSlot;
  servings: number;
  recipe: { servings: number; ingredients: RecipeIngredient[] };
};

export function macrosForPlan(p: MealPlanForMacros): MacroTotals {
  const perRecipe = sumIngredientMacros(p.recipe.ingredients);
  const perServing = scaleMacros(perRecipe, 1 / Math.max(1, p.recipe.servings));
  return scaleMacros(perServing, p.servings);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
