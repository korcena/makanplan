import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiHousehold } from "@/lib/api-auth";
import { parseDateYMD, toDateKey } from "@/lib/utils";
import { macrosForPlan, addMacros, zeroMacros, type MacroTotals } from "@/lib/macro-calculator";

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
    include: { recipe: { include: { ingredients: true } } },
    orderBy: { date: "asc" },
  });

  type DayEntry = {
    date: string;
    bySlot: Record<string, MacroTotals>;
    total: MacroTotals;
  };

  const map = new Map<string, DayEntry>();
  for (const p of plans) {
    const ymd = toDateKey(p.date);
    if (!map.has(ymd)) {
      map.set(ymd, {
        date: ymd,
        bySlot: {
          BREAKFAST: { ...zeroMacros },
          LUNCH: { ...zeroMacros },
          DINNER: { ...zeroMacros },
          SNACK: { ...zeroMacros },
        },
        total: { ...zeroMacros },
      });
    }
    const day = map.get(ymd)!;
    const m = macrosForPlan({
      slot: p.slot,
      servings: p.servings,
      recipe: { servings: p.recipe.servings, ingredients: p.recipe.ingredients },
    });
    day.bySlot[p.slot] = addMacros(day.bySlot[p.slot], m);
    day.total = addMacros(day.total, m);
  }

  const days = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json({ days });
}
