import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/api-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  newPassword: z.string().min(8).max(100).optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.name) {
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { name: parsed.data.name },
    });
  }

  if (parsed.data.newPassword) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const userId = auth.user.id;
  const householdId = auth.user.householdId;

  if (householdId) {
    const memberCount = await prisma.user.count({ where: { householdId } });

    if (memberCount <= 1) {
      await prisma.household.delete({ where: { id: householdId } });
    } else {
      const other = await prisma.user.findFirst({
        where: { householdId, NOT: { id: userId } },
      });
      if (other) {
        await prisma.recipe.updateMany({
          where: { createdById: userId },
          data: { createdById: other.id },
        });
        await prisma.mealPlan.updateMany({
          where: { createdById: userId },
          data: { createdById: other.id },
        });
      }
    }
  }

  await prisma.user.delete({ where: { id: userId } });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    await admin.auth.admin.deleteUser(userId);
  }

  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
