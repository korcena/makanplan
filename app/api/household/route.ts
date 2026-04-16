import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";
import { generateInviteCode } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  regenerateInviteCode: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  if (auth.user.householdId) return NextResponse.json({ error: "Already in a household" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.household.findUnique({ where: { inviteCode } });
    if (!exists) break;
    inviteCode = generateInviteCode();
  }

  const household = await prisma.household.create({
    data: {
      name: parsed.data.name,
      inviteCode,
      members: { connect: { id: auth.user.id } },
    },
  });
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { householdId: household.id, role: "OWNER" },
  });

  return NextResponse.json({ household });
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  if (!auth.user.householdId) return NextResponse.json({ error: "No household" }, { status: 400 });
  if (auth.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const data: { name?: string; inviteCode?: string } = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.regenerateInviteCode) data.inviteCode = generateInviteCode();

  const household = await prisma.household.update({ where: { id: auth.user.householdId }, data });
  return NextResponse.json({ household });
}
