"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { RecipeForm, blankRecipe, type RecipeFormValues } from "@/components/recipes/recipe-form";
import type { ParsedRecipe } from "@/lib/recipe-parser";
import { Sparkles, Link as LinkIcon } from "lucide-react";

function parsedToFormValues(p: ParsedRecipe, sourceUrl = ""): RecipeFormValues {
  const macroByName = new Map(p.macrosPerIngredient.map((m) => [m.name.toLowerCase(), m]));
  return {
    title: p.title,
    sourceUrl,
    instructions: p.instructions ?? "",
    notes: p.notes ?? "",
    servings: p.servings,
    prepTimeMinutes: p.prepTimeMinutes,
    cookTimeMinutes: p.cookTimeMinutes,
    tags: p.tags,
    ingredients: p.ingredients.map((ing) => {
      const m = macroByName.get(ing.name.toLowerCase());
      return {
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        category: ing.category,
        estimatedCalories: m ? m.calories : null,
        estimatedProteinG: m ? m.proteinG : null,
        estimatedCarbsG: m ? m.carbsG : null,
        estimatedFatG: m ? m.fatG : null,
      };
    }),
  };
}

export function NewRecipeClient() {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState<"text" | "url" | null>(null);
  const [initial, setInitial] = useState<RecipeFormValues | null>(null);

  const parseText = async () => {
    if (!text.trim()) return;
    setLoading("text");
    const res = await fetch("/api/recipes/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setLoading(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return toast(d.error || "Failed to parse", "error");
    }
    const data = await res.json();
    setInitial(parsedToFormValues(data.parsed as ParsedRecipe));
    toast("Parsed! Review and save.", "success");
  };

  const importUrl = async () => {
    if (!url.trim()) return;
    setLoading("url");
    const res = await fetch("/api/recipes/import-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    });
    setLoading(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return toast(d.error || "Failed to import", "error");
    }
    const data = await res.json();
    setInitial(parsedToFormValues(data.parsed as ParsedRecipe, data.sourceUrl));
    toast(
      data.source === "jsonld"
        ? "Imported from structured data. Review and save."
        : "Imported via AI parsing. Review and save.",
      "success"
    );
  };

  if (initial) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Review the parsed recipe below, make corrections, and save.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setInitial(null)}>
            Start over
          </Button>
        </div>
        <RecipeForm initial={initial} />
      </div>
    );
  }

  return (
    <Tabs defaultValue="text">
      <TabsList className="grid grid-cols-3 w-full max-w-lg">
        <TabsTrigger value="text">Paste text</TabsTrigger>
        <TabsTrigger value="url">From URL</TabsTrigger>
        <TabsTrigger value="manual">Manual</TabsTrigger>
      </TabsList>

      <TabsContent value="text">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Paste any recipe text
            </CardTitle>
            <CardDescription>
              We&apos;ll parse it into structured ingredients, steps, and macros.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={12}
              placeholder="Paste title, ingredients, steps, whatever format…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button onClick={parseText} disabled={loading === "text" || !text.trim()}>
              {loading === "text" ? "Parsing…" : "Parse with AI"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="url">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" /> Import from a URL
            </CardTitle>
            <CardDescription>
              We&apos;ll look for structured recipe data first, then fall back to AI parsing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Recipe URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/recipe"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <Button onClick={importUrl} disabled={loading === "url" || !url.trim()}>
              {loading === "url" ? "Importing…" : "Import"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="manual">
        <RecipeForm initial={blankRecipe()} />
      </TabsContent>
    </Tabs>
  );
}
