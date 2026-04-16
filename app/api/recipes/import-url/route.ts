import { NextResponse } from "next/server";
import { requireApiHousehold } from "@/lib/api-auth";
import { scrapeAndParseUrl } from "@/lib/url-scraper";

export async function POST(req: Request) {
  const auth = await requireApiHousehold();
  if ("response" in auth) return auth.response;

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) {
      return NextResponse.json({ error: "Only http(s) URLs are supported" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const result = await scrapeAndParseUrl(url);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
