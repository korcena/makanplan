import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateYMD } from "@/lib/utils";

const slotEnum = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);

const updateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slot: slotEnum.optional(),
  servings: z.number().int().positive().max(99).optional(),
  recipeId: z.string().optional(),
});

async function loadOwned(id: string, householdId: string) {
  const plan = await prisma.mealPlan.findUnique({ where: { id } });
  if (!plan || plan.householdId !== householdId) return null;
  return plan;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.householdId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await loadOwned(params.id, session.user.householdId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const newDate = parsed.data.date ? parseDateYMD(parsed.data.date) : existing.date;
  const newSlot = parsed.data.slot ?? existing.slot;

  // If moving to a new (date, slot), handle any existing plan there by deleting it first.
  if (
    newDate.getTime() !== existing.date.getTime() ||
    newSlot !== existing.slot
  ) {
    await prisma.mealPlan.deleteMany({
      where: {
        householdId: session.user.householdId,
        date: newDate,
        slot: newSlot,
        NOT: { id: existing.id },
      },
    });
  }

  if (parsed.data.recipeId) {
    const recipe = await prisma.recipe.findUnique({ where: { id: parsed.data.recipeId } });
    if (!recipe || recipe.householdId !== session.user.householdId) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
  }

  const plan = await prisma.mealPlan.update({
    where: { id: existing.id },
    data: {
      date: newDate,
      slot: newSlot,
      servings: parsed.data.servings ?? existing.servings,
      recipeId: parsed.data.recipeId ?? existing.recipeId,
    },
    include: { recipe: { select: { id: true, title: true } } },
  });

  return NextResponse.json({ plan });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.householdId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await loadOwned(params.id, session.user.householdId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.mealPlan.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
