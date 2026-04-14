import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      household: {
        include: {
          members: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });
  if (!dbUser?.household) redirect("/household");

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Household settings</h1>
      <SettingsClient
        me={{ id: dbUser.id, role: dbUser.role }}
        household={{
          id: dbUser.household.id,
          name: dbUser.household.name,
          inviteCode: dbUser.household.inviteCode,
        }}
        members={dbUser.household.members}
      />
    </div>
  );
}
