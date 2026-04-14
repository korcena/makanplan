"use client";

import { useMemo, useState } from "react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Grid3x3, List } from "lucide-react";

type R = {
  id: string;
  title: string;
  tags: string[];
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  ingredients: { name: string }[];
};

export function RecipesList({ recipes, allTags }: { recipes: R[]; allTags: string[] }) {
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return recipes.filter((r) => {
      if (activeTag && !r.tags.includes(activeTag)) return false;
      if (!ql) return true;
      if (r.title.toLowerCase().includes(ql)) return true;
      if (r.ingredients.some((i) => i.name.toLowerCase().includes(ql))) return true;
      return false;
    });
  }, [recipes, q, activeTag]);

  if (recipes.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-xl">
        <h2 className="text-xl font-semibold">No recipes yet!</h2>
        <p className="text-muted-foreground mt-1">Add your first recipe to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search title or ingredient…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex gap-1 border rounded-md p-1 bg-muted/50">
          <Button
            variant={view === "grid" ? "default" : "ghost"}
            size="icon"
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="icon"
            onClick={() => setView("list")}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveTag(null)}>
            <Badge variant={activeTag === null ? "default" : "outline"}>All</Badge>
          </button>
          {allTags.map((t) => (
            <button key={t} onClick={() => setActiveTag((cur) => (cur === t ? null : t))}>
              <Badge variant={activeTag === t ? "default" : "outline"}>{t}</Badge>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No recipes match your filters.</div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      ) : (
        <div className="divide-y border rounded-xl bg-card">
          {filtered.map((r) => (
            <a
              key={r.id}
              href={`/recipes/${r.id}`}
              className="flex items-center gap-4 p-4 hover:bg-accent"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground">
                  {r.servings} servings ·{" "}
                  {r.prepTimeMinutes != null || r.cookTimeMinutes != null
                    ? `${(r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0)} min · `
                    : ""}
                  {r.ingredients.length} ingredients
                </div>
              </div>
              <div className="hidden sm:flex gap-1 flex-wrap max-w-[40%] justify-end">
                {r.tags.slice(0, 3).map((t) => (
                  <Badge key={t} variant="soft">
                    {t}
                  </Badge>
                ))}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
