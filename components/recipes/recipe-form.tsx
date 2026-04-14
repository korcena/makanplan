"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { categoryLabel } from "@/lib/utils";

type Category =
  | "PRODUCE"
  | "DAIRY"
  | "MEAT"
  | "SEAFOOD"
  | "PANTRY"
  | "FROZEN"
  | "BAKERY"
  | "BEVERAGES"
  | "OTHER";

const CATEGORIES: Category[] = [
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

export type RecipeFormValues = {
  title: string;
  sourceUrl: string;
  instructions: string;
  notes: string;
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  tags: string[];
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: Category;
    estimatedCalories: number | null;
    estimatedProteinG: number | null;
    estimatedCarbsG: number | null;
    estimatedFatG: number | null;
  }>;
};

export function blankRecipe(): RecipeFormValues {
  return {
    title: "",
    sourceUrl: "",
    instructions: "",
    notes: "",
    servings: 4,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    tags: [],
    ingredients: [
      {
        name: "",
        quantity: 1,
        unit: "",
        category: "OTHER",
        estimatedCalories: null,
        estimatedProteinG: null,
        estimatedCarbsG: null,
        estimatedFatG: null,
      },
    ],
  };
}

export function RecipeForm({
  initial,
  recipeId,
}: {
  initial: RecipeFormValues;
  recipeId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<RecipeFormValues>(initial);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof RecipeFormValues>(k: K, v: RecipeFormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const addIngredient = () =>
    setValues((s) => ({
      ...s,
      ingredients: [
        ...s.ingredients,
        {
          name: "",
          quantity: 1,
          unit: "",
          category: "OTHER",
          estimatedCalories: null,
          estimatedProteinG: null,
          estimatedCarbsG: null,
          estimatedFatG: null,
        },
      ],
    }));

  const removeIngredient = (idx: number) =>
    setValues((s) => ({ ...s, ingredients: s.ingredients.filter((_, i) => i !== idx) }));

  const updateIngredient = (idx: number, patch: Partial<RecipeFormValues["ingredients"][number]>) =>
    setValues((s) => ({
      ...s,
      ingredients: s.ingredients.map((i, idx2) => (idx2 === idx ? { ...i, ...patch } : i)),
    }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (!values.tags.includes(t)) update("tags", [...values.tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => update("tags", values.tags.filter((x) => x !== t));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) return toast("Title is required", "error");
    if (values.ingredients.length === 0) return toast("At least one ingredient is required", "error");

    setSaving(true);
    const payload = {
      title: values.title.trim(),
      sourceUrl: values.sourceUrl.trim() || null,
      instructions: values.instructions,
      notes: values.notes.trim() || null,
      servings: values.servings,
      prepTimeMinutes: values.prepTimeMinutes,
      cookTimeMinutes: values.cookTimeMinutes,
      tags: values.tags,
      ingredients: values.ingredients.map((i) => ({
        name: i.name.trim(),
        quantity: i.quantity,
        unit: i.unit.trim(),
        category: i.category,
        estimatedCalories: i.estimatedCalories,
        estimatedProteinG: i.estimatedProteinG,
        estimatedCarbsG: i.estimatedCarbsG,
        estimatedFatG: i.estimatedFatG,
      })),
    };

    const url = recipeId ? `/api/recipes/${recipeId}` : "/api/recipes";
    const method = recipeId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return toast(d.error || "Failed to save", "error");
    }
    const data = await res.json();
    toast(recipeId ? "Recipe updated" : "Recipe saved", "success");
    router.push(`/recipes/${data.recipe.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={values.title} onChange={(e) => update("title", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                min={1}
                value={values.servings}
                onChange={(e) => update("servings", Math.max(1, parseInt(e.target.value || "1", 10)))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prep">Prep (min)</Label>
              <Input
                id="prep"
                type="number"
                min={0}
                value={values.prepTimeMinutes ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  update("prepTimeMinutes", v === "" ? null : Math.max(0, parseInt(v, 10)));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cook">Cook (min)</Label>
              <Input
                id="cook"
                type="number"
                min={0}
                value={values.cookTimeMinutes ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  update("cookTimeMinutes", v === "" ? null : Math.max(0, parseInt(v, 10)));
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source URL (optional)</Label>
            <Input
              id="source"
              type="url"
              placeholder="https://…"
              value={values.sourceUrl}
              onChange={(e) => update("sourceUrl", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {values.tags.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => removeTag(t)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent text-accent-foreground text-xs hover:bg-accent/80"
                >
                  {t} ✕
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingredients</CardTitle>
          <CardDescription>Each ingredient with quantity, unit, category, and (optional) macros.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {values.ingredients.map((ing, idx) => (
            <div key={idx} className="grid gap-2 rounded-md border p-3">
              <div className="grid grid-cols-12 gap-2">
                <Input
                  className="col-span-12 sm:col-span-5"
                  placeholder="Ingredient name"
                  value={ing.name}
                  onChange={(e) => updateIngredient(idx, { name: e.target.value })}
                />
                <Input
                  className="col-span-4 sm:col-span-2"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Qty"
                  value={ing.quantity}
                  onChange={(e) =>
                    updateIngredient(idx, { quantity: parseFloat(e.target.value || "0") })
                  }
                />
                <Input
                  className="col-span-4 sm:col-span-2"
                  placeholder="Unit"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(idx, { unit: e.target.value })}
                />
                <div className="col-span-3 sm:col-span-2">
                  <Select
                    value={ing.category}
                    onValueChange={(v) => updateIngredient(idx, { category: v as Category })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {categoryLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeIngredient(idx)}
                  className="col-span-1"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <MacroInput
                  label="kcal"
                  value={ing.estimatedCalories}
                  onChange={(v) => updateIngredient(idx, { estimatedCalories: v })}
                />
                <MacroInput
                  label="P (g)"
                  value={ing.estimatedProteinG}
                  onChange={(v) => updateIngredient(idx, { estimatedProteinG: v })}
                />
                <MacroInput
                  label="C (g)"
                  value={ing.estimatedCarbsG}
                  onChange={(v) => updateIngredient(idx, { estimatedCarbsG: v })}
                />
                <MacroInput
                  label="F (g)"
                  value={ing.estimatedFatG}
                  onChange={(v) => updateIngredient(idx, { estimatedFatG: v })}
                />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addIngredient}>
            <Plus className="h-4 w-4 mr-1" /> Add ingredient
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
          <CardDescription>Markdown supported. Numbered steps recommended.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={10}
            value={values.instructions}
            onChange={(e) => update("instructions", e.target.value)}
            placeholder={"1. Preheat oven to 200°C.\n2. Chop onions…"}
          />
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={values.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button type="submit" disabled={saving} size="lg">
          {saving ? "Saving…" : recipeId ? "Save changes" : "Save recipe"}
        </Button>
      </div>
    </form>
  );
}

function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step="0.1"
        min={0}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Math.max(0, parseFloat(v)));
        }}
      />
    </div>
  );
}
