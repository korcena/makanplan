import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AccountClient } from "./account-client";

export default async function AccountPage() {
  const u = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: u.id },
    select: { id: true, name: true, email: true, householdId: true },
  });
  if (!user) return null;

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-6">Account</h1>
      <AccountClient user={user} />
    </div>
  );
}
