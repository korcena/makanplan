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

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const tag = url.searchParams.get("tag")?.trim() ?? "";

  const where: Record<string, unknown> = { householdId: session.user.householdId };
  const and: Record<string, unknown>[] = [];
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { ingredients: { some: { name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  if (tag) and.push({ tags: { has: tag } });
  if (and.length > 0) where.AND = and;

  const recipes = await prisma.recipe.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { ingredients: true },
  });

  return NextResponse.json({ recipes });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = recipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const recipe = await prisma.$transaction(async (tx) => {
    return tx.recipe.create({
      data: {
        householdId: session.user.householdId!,
        createdById: session.user.id,
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
