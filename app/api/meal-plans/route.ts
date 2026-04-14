import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateYMD } from "@/lib/utils";

const slotEnum = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: slotEnum,
  recipeId: z.string().min(1),
  servings: z.number().int().positive().max(99),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start and end required" }, { status: 400 });

  const plans = await prisma.mealPlan.findMany({
    where: {
      householdId: session.user.householdId,
      date: { gte: parseDateYMD(start), lte: parseDateYMD(end) },
    },
    include: { recipe: { select: { id: true, title: true } } },
    orderBy: [{ date: "asc" }, { slot: "asc" }],
  });

  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.householdId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const recipe = await prisma.recipe.findUnique({ where: { id: parsed.data.recipeId } });
  if (!recipe || recipe.householdId !== session.user.householdId) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const date = parseDateYMD(parsed.data.date);

  const plan = await prisma.mealPlan.upsert({
    where: {
      householdId_date_slot: {
        householdId: session.user.householdId,
        date,
        slot: parsed.data.slot,
      },
    },
    update: {
      recipeId: parsed.data.recipeId,
      servings: parsed.data.servings,
      createdById: session.user.id,
    },
    create: {
      householdId: session.user.householdId,
      createdById: session.user.id,
      date,
      slot: parsed.data.slot,
      recipeId: parsed.data.recipeId,
      servings: parsed.data.servings,
    },
    include: { recipe: { select: { id: true, title: true } } },
  });

  return NextResponse.json({ plan });
}
