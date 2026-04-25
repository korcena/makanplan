import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiHousehold } from "@/lib/api-auth";
import { parseDateYMD } from "@/lib/utils";

const slotEnum = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: slotEnum,
  text: z.string().min(1).max(500),
});

export async function GET(req: Request) {
  const auth = await requireApiHousehold();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!start || !end) return NextResponse.json({ error: "start and end required" }, { status: 400 });

  const notes = await prisma.calendarNote.findMany({
    where: {
      householdId: auth.householdId,
      date: { gte: parseDateYMD(start), lte: parseDateYMD(end) },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const auth = await requireApiHousehold();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const note = await prisma.calendarNote.create({
    data: {
      householdId: auth.householdId,
      createdById: auth.user.id,
      date: parseDateYMD(parsed.data.date),
      slot: parsed.data.slot,
      text: parsed.data.text,
    },
  });

  return NextResponse.json({ note });
}
