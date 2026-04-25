import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiHousehold } from "@/lib/api-auth";

const updateSchema = z.object({
  text: z.string().min(1).max(500),
});

async function loadOwned(id: string, householdId: string) {
  const note = await prisma.calendarNote.findUnique({ where: { id } });
  if (!note || note.householdId !== householdId) return null;
  return note;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiHousehold();
  if ("response" in auth) return auth.response;

  const existing = await loadOwned(params.id, auth.householdId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const note = await prisma.calendarNote.update({
    where: { id: existing.id },
    data: { text: parsed.data.text },
  });

  return NextResponse.json({ note });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiHousehold();
  if ("response" in auth) return auth.response;

  const existing = await loadOwned(params.id, auth.householdId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.calendarNote.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
