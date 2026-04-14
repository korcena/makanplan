import { requireHousehold } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  const { householdId } = await requireHousehold();
  const recipes = await prisma.recipe.findMany({
    where: { householdId },
    select: { id: true, title: true, servings: true, tags: true },
    orderBy: { title: "asc" },
  });
  return (
    <div className="container max-w-7xl py-8">
      <h1 className="text-3xl font-bold mb-4">Meal calendar</h1>
      <CalendarClient recipes={recipes} />
    </div>
  );
}
