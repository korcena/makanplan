import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ inviteCode: z.string().min(4).max(16) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.householdId) return NextResponse.json({ error: "Already in a household" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const household = await prisma.household.findUnique({
    where: { inviteCode: parsed.data.inviteCode.trim().toUpperCase() },
  });
  if (!household) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });

  await prisma.user.update({
    where: { id: user.id },
    data: { householdId: household.id, role: "MEMBER" },
  });

  return NextResponse.json({ household });
}
