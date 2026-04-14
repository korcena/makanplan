export type ParsedIngredient = {
  name: string;
  quantity: number;
  unit: string;
  category:
    | "PRODUCE"
    | "DAIRY"
    | "MEAT"
    | "SEAFOOD"
    | "PANTRY"
    | "FROZEN"
    | "BAKERY"
    | "BEVERAGES"
    | "OTHER";
};

export type ParsedMacro = {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type ParsedRecipe = {
  title: string;
  ingredients: ParsedIngredient[];
  instructions: string;
  notes: string | null;
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  tags: string[];
  macrosPerIngredient: ParsedMacro[];
};

const PARSER_PROMPT = `You are a recipe parser. Given the following raw recipe text, extract and return a JSON object with this exact structure:
{
  "title": "string",
  "ingredients": [
    { "name": "string", "quantity": number, "unit": "string", "category": "PRODUCE|DAIRY|MEAT|SEAFOOD|PANTRY|FROZEN|BAKERY|BEVERAGES|OTHER" }
  ],
  "instructions": "string (markdown numbered steps)",
  "notes": "string or null",
  "servings": number,
  "prepTimeMinutes": number or null,
  "cookTimeMinutes": number or null,
  "tags": ["string"],
  "macrosPerIngredient": [
    { "name": "string", "calories": number, "proteinG": number, "carbsG": number, "fatG": number }
  ]
}
Return ONLY valid JSON, no markdown fences, no preamble.`;

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  return t.trim();
}

function coerceParsed(raw: unknown): ParsedRecipe {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const title = typeof obj.title === "string" && obj.title ? obj.title : "Untitled recipe";
  const ingredientsRaw = Array.isArray(obj.ingredients) ? obj.ingredients : [];
  const ingredients: ParsedIngredient[] = ingredientsRaw.map((x) => {
    const i = x as Record<string, unknown>;
    const q = Number(i.quantity);
    return {
      name: String(i.name ?? "").trim() || "ingredient",
      quantity: Number.isFinite(q) && q > 0 ? q : 1,
      unit: String(i.unit ?? "").trim(),
      category: normalizeCategory(String(i.category ?? "OTHER")),
    };
  });
  const instructions =
    typeof obj.instructions === "string" ? obj.instructions : "";
  const notes = typeof obj.notes === "string" ? obj.notes : null;
  const servings = Number(obj.servings);
  const prep = Number(obj.prepTimeMinutes);
  const cook = Number(obj.cookTimeMinutes);
  const tags = Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string") : [];
  const macrosRaw = Array.isArray(obj.macrosPerIngredient) ? obj.macrosPerIngredient : [];
  const macrosPerIngredient: ParsedMacro[] = macrosRaw.map((x) => {
    const m = x as Record<string, unknown>;
    return {
      name: String(m.name ?? ""),
      calories: Number(m.calories) || 0,
      proteinG: Number(m.proteinG) || 0,
      carbsG: Number(m.carbsG) || 0,
      fatG: Number(m.fatG) || 0,
    };
  });

  return {
    title,
    ingredients,
    instructions,
    notes,
    servings: Number.isFinite(servings) && servings > 0 ? Math.round(servings) : 4,
    prepTimeMinutes: Number.isFinite(prep) && prep > 0 ? Math.round(prep) : null,
    cookTimeMinutes: Number.isFinite(cook) && cook > 0 ? Math.round(cook) : null,
    tags,
    macrosPerIngredient,
  };
}

function normalizeCategory(s: string): ParsedIngredient["category"] {
  const v = s.toUpperCase();
  const allowed: ParsedIngredient["category"][] = [
    "PRODUCE",
    "DAIRY",
    "MEAT",
    "SEAFOOD",
    "PANTRY",
    "FROZEN",
    "BAKERY",
    "BEVERAGES",
    "OTHER",
  ];
  return (allowed as string[]).includes(v) ? (v as ParsedIngredient["category"]) : "OTHER";
}

export async function parseRecipeWithClaude(rawText: string): Promise<ParsedRecipe> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const trimmed = rawText.trim();
  if (!trimmed) throw new Error("Empty recipe text");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: PARSER_PROMPT,
      messages: [
        {
          role: "user",
          content: trimmed.slice(0, 60_000),
        },
      ],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Claude API error ${resp.status}: ${body.slice(0, 500)}`);
  }

  const data = (await resp.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (data.content ?? [])
    .map((b) => (b.type === "text" ? b.text ?? "" : ""))
    .join("");

  const json = JSON.parse(stripFences(text));
  return coerceParsed(json);
}
