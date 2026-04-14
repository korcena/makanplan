import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { HouseholdChooser } from "./household-chooser";

export default async function HouseholdPage() {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { household: { include: { members: true } } },
  });

  if (dbUser?.household) {
    redirect("/household/settings");
  }

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold mb-2">Join or create a household</h1>
      <p className="text-muted-foreground mb-8">
        Households share recipes, meal plans, and shopping lists. Create a new one or join with an invite code.
      </p>
      <HouseholdChooser />
    </div>
  );
}
