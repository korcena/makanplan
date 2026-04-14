import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const actionSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["remove", "transfer_ownership"]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me?.householdId) return NextResponse.json({ error: "No household" }, { status: 400 });
  if (me.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (parsed.data.userId === me.id) {
    return NextResponse.json({ error: "Cannot act on yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target || target.householdId !== me.householdId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (parsed.data.action === "remove") {
    await prisma.user.update({
      where: { id: target.id },
      data: { householdId: null, role: "MEMBER" },
    });
  } else {
    await prisma.$transaction([
      prisma.user.update({ where: { id: target.id }, data: { role: "OWNER" } }),
      prisma.user.update({ where: { id: me.id }, data: { role: "MEMBER" } }),
    ]);
  }

  return NextResponse.json({ ok: true });
}
