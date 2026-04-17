import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";

const ingredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string(),
});

const schema = z.object({
  ingredients: z.array(ingredientSchema).min(1).max(100),
});

const PROMPT = `You are a nutrition estimation engine. Given a list of recipe ingredients (each with a name, quantity, and unit), estimate the total macronutrients for each ingredient at the given quantity.

Return a JSON array in this exact format — one entry per ingredient, in the same order as the input:
[
  { "calories": number, "proteinG": number, "carbsG": number, "fatG": number }
]

Rules:
- Estimate macros for the TOTAL quantity specified (not per unit)
- Use reasonable nutritional estimates based on common food databases
- Round to 1 decimal place
- Return ONLY the JSON array, no markdown fences, no preamble`;

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  return t.trim();
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const lines = parsed.data.ingredients
    .map((i, idx) => `${idx + 1}. ${i.quantity} ${i.unit} ${i.name}`.trim())
    .join("\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: PROMPT,
      messages: [{ role: "user", content: lines }],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: `Claude API error ${resp.status}: ${text.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const data = (await resp.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (data.content ?? [])
    .map((b) => (b.type === "text" ? b.text ?? "" : ""))
    .join("");

  try {
    const macros = JSON.parse(stripFences(text));
    if (!Array.isArray(macros)) throw new Error("Expected array");
    return NextResponse.json({ macros });
  } catch {
    return NextResponse.json(
      { error: "Failed to parse macro estimates" },
      { status: 502 },
    );
  }
}
