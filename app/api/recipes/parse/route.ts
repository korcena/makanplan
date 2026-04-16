import { NextResponse } from "next/server";
import { requireApiHousehold } from "@/lib/api-auth";
import { parseRecipeWithClaude } from "@/lib/recipe-parser";

export async function POST(req: Request) {
  const auth = await requireApiHousehold();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) return NextResponse.json({ error: "Empty text" }, { status: 400 });

  try {
    const parsed = await parseRecipeWithClaude(text);
    return NextResponse.json({ parsed });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
