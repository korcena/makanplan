import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const categoryEnum = z.enum([
  "PRODUCE",
  "DAIRY",
  "MEAT",
  "SEAFOOD",
  "PANTRY",
  "FROZEN",
  "BAKERY",
  "BEVERAGES",
  "OTHER",
]);

const ingredientSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().nonnegative(),
  unit: z.string().max(40).default(""),
  category: categoryEnum.default("OTHER"),
  estimatedCalories: z.number().nullable().optional(),
  estimatedProteinG: z.number().nullable().optional(),
  estimatedCarbsG: z.number().nullable().optional(),
  estimatedFatG: z.number().nullable().optional(),
});

const recipeSchema = z.object({
  title: z.string().min(1).max(200),
  sourceUrl: z.string().url().nullable().optional(),
  instructions: z.string().default(""),
  notes: z.string().nullable().optional(),
  servings: z.number().int().positive().default(4),
  prepTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  cookTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(ingredientSchema).min(1),
});

async function requireOwnedRecipe(id: string, householdId: string) {
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: true },
  });
  if (!recipe || recipe.householdId !== householdId) return null;
  return recipe;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.householdId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const recipe = await requireOwnedRecipe(params.id, session.user.householdId);
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ recipe });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.householdId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await requireOwnedRecipe(params.id, session.user.householdId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = recipeSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const recipe = await prisma.$transaction(async (tx) => {
    await tx.recipeIngredient.deleteMany({ where: { recipeId: existing.id } });
    return tx.recipe.update({
      where: { id: existing.id },
      data: {
        title: d.title,
        sourceUrl: d.sourceUrl ?? null,
        instructions: d.instructions,
        notes: d.notes ?? null,
        servings: d.servings,
        prepTimeMinutes: d.prepTimeMinutes ?? null,
        cookTimeMinutes: d.cookTimeMinutes ?? null,
        tags: d.tags,
        ingredients: {
          create: d.ingredients.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            category: i.category,
            estimatedCalories: i.estimatedCalories ?? null,
            estimatedProteinG: i.estimatedProteinG ?? null,
            estimatedCarbsG: i.estimatedCarbsG ?? null,
            estimatedFatG: i.estimatedFatG ?? null,
          })),
        },
      },
      include: { ingredients: true },
    });
  });

  return NextResponse.json({ recipe });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.householdId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await requireOwnedRecipe(params.id, session.user.householdId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recipe.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
