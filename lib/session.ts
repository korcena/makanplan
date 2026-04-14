import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

export async function requireHousehold() {
  const user = await requireUser();
  if (!user.householdId) {
    redirect("/household");
  }
  return { user, householdId: user.householdId as string };
}

export async function getCurrentUserFull() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { household: true },
  });
}
