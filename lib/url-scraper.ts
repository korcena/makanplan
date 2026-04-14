import * as cheerio from "cheerio";
import { parseRecipeWithClaude, type ParsedRecipe, type ParsedIngredient } from "./recipe-parser";

type JsonLdRecipe = {
  name?: string;
  recipeIngredient?: string[];
  recipeInstructions?: unknown;
  description?: string;
  recipeYield?: string | number | string[];
  prepTime?: string;
  cookTime?: string;
  keywords?: string | string[];
  recipeCategory?: string | string[];
  recipeCuisine?: string | string[];
};

function parseIsoDurationToMinutes(iso: string | undefined | null): number | null {
  if (!iso || typeof iso !== "string") return null;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return null;
  const h = Number(m[1] ?? 0);
  const mins = Number(m[2] ?? 0);
  return h * 60 + mins;
}

function extractServings(y: JsonLdRecipe["recipeYield"]): number {
  if (!y) return 4;
  const s = Array.isArray(y) ? y[0] : y;
  const num = typeof s === "number" ? s : parseInt(String(s).match(/\d+/)?.[0] ?? "4", 10);
  return Number.isFinite(num) && num > 0 ? num : 4;
}

function extractInstructionsText(inst: unknown): string {
  if (!inst) return "";
  if (typeof inst === "string") return inst;
  if (Array.isArray(inst)) {
    return inst
      .map((step, i) => {
        if (typeof step === "string") return `${i + 1}. ${step}`;
        if (step && typeof step === "object" && "text" in step) {
          return `${i + 1}. ${String((step as { text: string }).text)}`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function findJsonLdRecipe($: cheerio.CheerioAPI): JsonLdRecipe | null {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    const txt = $(scripts[i]).contents().text();
    try {
      const parsed = JSON.parse(txt);
      const candidates: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      for (const c of candidates) {
        const found = recurseRecipe(c);
        if (found) return found;
      }
    } catch {
      // ignore malformed
    }
  }
  return null;
}

function recurseRecipe(obj: unknown): JsonLdRecipe | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const type = o["@type"];
  const typeMatches =
    type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
  if (typeMatches) return o as JsonLdRecipe;
  if (Array.isArray(o["@graph"])) {
    for (const item of o["@graph"] as unknown[]) {
      const r = recurseRecipe(item);
      if (r) return r;
    }
  }
  for (const v of Object.values(o)) {
    if (v && typeof v === "object") {
      const r = recurseRecipe(v);
      if (r) return r;
    }
  }
  return null;
}

export type ScrapeResult = {
  parsed: ParsedRecipe;
  source: "jsonld" | "llm";
  sourceUrl: string;
};

export async function scrapeAndParseUrl(url: string): Promise<ScrapeResult> {
  let html = "";
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MakanPlanBot/1.0; +https://makanplan.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
    html = await resp.text();
  } catch (e) {
    throw new Error(`Could not fetch URL: ${(e as Error).message}`);
  }

  const $ = cheerio.load(html);
  const jsonld = findJsonLdRecipe($);

  if (jsonld && jsonld.recipeIngredient && jsonld.recipeIngredient.length > 0) {
    const ingredientsRaw = jsonld.recipeIngredient.map((s) => rawIngredientToParsed(String(s)));
    const parsed: ParsedRecipe = {
      title: jsonld.name ?? $("title").text().trim().slice(0, 200) || "Imported recipe",
      ingredients: ingredientsRaw,
      instructions: extractInstructionsText(jsonld.recipeInstructions),
      notes: jsonld.description ?? null,
      servings: extractServings(jsonld.recipeYield),
      prepTimeMinutes: parseIsoDurationToMinutes(jsonld.prepTime ?? undefined),
      cookTimeMinutes: parseIsoDurationToMinutes(jsonld.cookTime ?? undefined),
      tags: extractTags(jsonld),
      macrosPerIngredient: [],
    };
    return { parsed, source: "jsonld", sourceUrl: url };
  }

  // Fallback: strip scripts, send main content text to Claude.
  $("script, style, nav, header, footer, noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 30_000);
  if (!text) throw new Error("Could not extract any content from page");

  const parsed = await parseRecipeWithClaude(text);
  return { parsed, source: "llm", sourceUrl: url };
}

function extractTags(j: JsonLdRecipe): string[] {
  const out = new Set<string>();
  const pushAll = (v: string | string[] | undefined) => {
    if (!v) return;
    const arr = Array.isArray(v) ? v : v.split(",");
    arr.forEach((s) => {
      const t = s.trim().toLowerCase();
      if (t) out.add(t);
    });
  };
  pushAll(j.keywords);
  pushAll(j.recipeCategory);
  pushAll(j.recipeCuisine);
  return Array.from(out).slice(0, 10);
}

// Very approximate ingredient line parser for fallback JSON-LD lines
function rawIngredientToParsed(line: string): ParsedIngredient {
  const original = line.trim();
  // Match leading quantity: supports "1", "1.5", "1/2", "1 1/2", unicode ½
  const unicodeFractions: Record<string, number> = {
    "½": 0.5,
    "⅓": 0.33,
    "⅔": 0.67,
    "¼": 0.25,
    "¾": 0.75,
    "⅕": 0.2,
    "⅖": 0.4,
    "⅗": 0.6,
    "⅘": 0.8,
    "⅙": 0.167,
    "⅚": 0.833,
    "⅛": 0.125,
    "⅜": 0.375,
    "⅝": 0.625,
    "⅞": 0.875,
  };
  let rest = original.replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (m) => ` ${unicodeFractions[m]} `);
  rest = rest.replace(/\s+/g, " ").trim();

  const qtyMatch = rest.match(/^([\d./\s]+)/);
  let quantity = 1;
  if (qtyMatch) {
    const raw = qtyMatch[1].trim();
    quantity = parseMixed(raw);
    rest = rest.slice(qtyMatch[0].length).trim();
  }

  const units = [
    "cup",
    "cups",
    "tbsp",
    "tablespoon",
    "tablespoons",
    "tsp",
    "teaspoon",
    "teaspoons",
    "oz",
    "ounce",
    "ounces",
    "lb",
    "lbs",
    "pound",
    "pounds",
    "g",
    "gram",
    "grams",
    "kg",
    "ml",
    "l",
    "liter",
    "liters",
    "litre",
    "litres",
    "clove",
    "cloves",
    "slice",
    "slices",
    "piece",
    "pieces",
    "can",
    "cans",
    "pinch",
    "dash",
    "bunch",
  ];
  let unit = "";
  const firstWordMatch = rest.match(/^([a-zA-Z.]+)\s*/);
  if (firstWordMatch) {
    const w = firstWordMatch[1].replace(/\.$/, "").toLowerCase();
    if (units.includes(w)) {
      unit = w;
      rest = rest.slice(firstWordMatch[0].length).trim();
    }
  }

  return {
    name: rest || original,
    quantity,
    unit,
    category: "OTHER",
  };
}

function parseMixed(raw: string): number {
  const s = raw.trim();
  if (!s) return 1;
  // handle ranges like "2-3" → take lower
  const range = s.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*\d+(?:\.\d+)?$/);
  if (range) return Number(range[1]);

  let total = 0;
  for (const part of s.split(/\s+/)) {
    if (part.includes("/")) {
      const [a, b] = part.split("/").map(Number);
      if (a && b) total += a / b;
    } else {
      const n = Number(part);
      if (Number.isFinite(n)) total += n;
    }
  }
  return total || 1;
}
