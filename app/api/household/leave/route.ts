import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
