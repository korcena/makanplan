import type { IngredientCategory } from "@prisma/client";

export type AggInput = {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  // factor to multiply quantity by (planned servings / recipe default servings)
  factor: number;
};

export type AggItem = {
  key: string;
  name: string;
  unit: string;
  quantity: number;
  category: IngredientCategory;
};

export type AggGroup = {
  category: IngredientCategory;
  items: AggItem[];
};

const CATEGORY_ORDER: IngredientCategory[] = [
  "PRODUCE",
  "MEAT",
  "SEAFOOD",
  "DAIRY",
  "BAKERY",
  "PANTRY",
  "FROZEN",
  "BEVERAGES",
  "OTHER",
];

export function aggregate(inputs: AggInput[]): AggGroup[] {
  const map = new Map<string, AggItem>();
  for (const i of inputs) {
    const name = i.name.trim().toLowerCase();
    const unit = i.unit.trim().toLowerCase();
    const key = `${i.category}::${name}::${unit}`;
    const qty = i.quantity * i.factor;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += qty;
    } else {
      map.set(key, {
        key,
        name: i.name.trim(),
        unit: i.unit.trim(),
        quantity: qty,
        category: i.category,
      });
    }
  }

  const byCat = new Map<IngredientCategory, AggItem[]>();
  for (const item of map.values()) {
    const arr = byCat.get(item.category) ?? [];
    arr.push(item);
    byCat.set(item.category, arr);
  }

  const groups: AggGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    const items = byCat.get(cat);
    if (!items || items.length === 0) continue;
    items.sort((a, b) => a.name.localeCompare(b.name));
    groups.push({ category: cat, items });
  }
  return groups;
}

export function formatQuantity(q: number): string {
  if (!Number.isFinite(q)) return "";
  const rounded = Math.round(q * 100) / 100;
  return rounded.toString();
}
