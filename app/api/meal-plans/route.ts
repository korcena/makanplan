import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiHousehold } from "@/lib/api-auth";
import { parseDateYMD } from "@/lib/utils";

const slotEnum = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: slotEnum,
  recipeId: z.string().min(1),
  servings: z.number().int().positive().max(99),
});

export async function GET(req: Request) {
  const auth = await requireApiHousehold();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start and end required" }, { status: 400 });

  const plans = await prisma.mealPlan.findMany({
    where: {
      householdId: auth.householdId,
      date: { gte: parseDateYMD(start), lte: parseDateYMD(end) },
    },
    include: { recipe: { select: { id: true, title: true } } },
    orderBy: [{ date: "asc" }, { slot: "asc" }],
  });

  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const auth = await requireApiHousehold();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const recipe = await prisma.recipe.findUnique({ where: { id: parsed.data.recipeId } });
  if (!recipe || recipe.householdId !== auth.householdId) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const date = parseDateYMD(parsed.data.date);

  const plan = await prisma.mealPlan.create({
    data: {
      householdId: auth.householdId,
      createdById: auth.user.id,
      date,
      slot: parsed.data.slot,
      recipeId: parsed.data.recipeId,
      servings: parsed.data.servings,
    },
    include: { recipe: { select: { id: true, title: true } } },
  });

  return NextResponse.json({ plan });
}
