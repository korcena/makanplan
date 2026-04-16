import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";

const schema = z.object({ inviteCode: z.string().min(4).max(16) });

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  if (auth.user.householdId) return NextResponse.json({ error: "Already in a household" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const household = await prisma.household.findUnique({
    where: { inviteCode: parsed.data.inviteCode.trim().toUpperCase() },
  });
  if (!household) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { householdId: household.id, role: "MEMBER" },
  });

  return NextResponse.json({ household });
}
