import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";

export async function POST() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    include: { household: { include: { members: true } } },
  });
  if (!user?.householdId || !user.household)
    return NextResponse.json({ error: "No household" }, { status: 400 });

  if (user.role === "OWNER" && user.household.members.length > 1) {
    return NextResponse.json(
      { error: "Transfer ownership before leaving, or remove other members first." },
      { status: 400 }
    );
  }

  if (user.household.members.length === 1) {
    // Sole member — delete the household
    await prisma.user.update({ where: { id: user.id }, data: { householdId: null, role: "MEMBER" } });
    await prisma.household.delete({ where: { id: user.household.id } });
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { householdId: null, role: "MEMBER" } });
  }

  return NextResponse.json({ ok: true });
}
