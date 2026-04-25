import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiHousehold } from "@/lib/api-auth";
import { parseDateYMD } from "@/lib/utils";
import { aggregate, type AggInput } from "@/lib/shopping-aggregator";

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
      isLeftover: false,
    },
    include: { recipe: { include: { ingredients: true } } },
  });

  const inputs: AggInput[] = [];
  for (const p of plans) {
    const factor = p.servings / Math.max(1, p.recipe.servings);
    for (const ing of p.recipe.ingredients) {
      inputs.push({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        category: ing.category,
        factor,
      });
    }
  }

  const groups = aggregate(inputs);
  return NextResponse.json({ groups, mealCount: plans.length });
}
