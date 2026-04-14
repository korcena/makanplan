"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

type MealSlot = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
type Recipe = { id: string; title: string; servings: number; tags: string[] };
type Plan = { id: string; recipe: { id: string; title: string }; servings: number };

export function RecipePickerModal({
  open,
  onOpenChange,
  date,
  slot,
  existingPlan,
  recipes,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string;
  slot: MealSlot;
  existingPlan?: Plan;
  recipes: Recipe[];
  onSave: (opts: {
    date: string;
    slot: MealSlot;
    recipeId: string;
    servings: number;
    existingPlanId?: string;
  }) => Promise<void> | void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(existingPlan?.recipe.id ?? null);
  const [servings, setServings] = useState(existingPlan?.servings ?? 4);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [recipes, query]);

  const selected = recipes.find((r) => r.id === selectedId) ?? null;

  const onConfirm = async () => {
    if (!selectedId) return;
    await onSave({
      date,
      slot,
      recipeId: selectedId,
      servings,
      existingPlanId: existingPlan?.id,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {existingPlan ? "Edit meal" : "Add meal"} · {date} ·{" "}
            {slot.charAt(0) + slot.slice(1).toLowerCase()}
          </DialogTitle>
        </DialogHeader>

        {recipes.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            No recipes yet.{" "}
            <Link href="/recipes/new" className="text-primary hover:underline">
              Add your first recipe
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              placeholder="Search recipes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
              {filtered.length === 0 ? (
                <div className="p-6 text-sm text-center text-muted-foreground">No matches.</div>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedId(r.id);
                      setServings((s) => (existingPlan ? s : r.servings));
                    }}
                    className={
                      "w-full text-left p-3 hover:bg-accent flex items-center justify-between gap-3 " +
                      (selectedId === r.id ? "bg-accent" : "")
                    }
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.title}</div>
                      {r.tags.length > 0 && (
                        <div className="text-xs text-muted-foreground truncate">
                          {r.tags.slice(0, 3).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {r.servings} servings
                    </div>
                  </button>
                ))
              )}
            </div>

            {selected && (
              <div className="rounded-md border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Selected</div>
                  <div className="font-medium truncate">{selected.title}</div>
                </div>
                <Link
                  href={`/recipes/${selected.id}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  target="_blank"
                >
                  View <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="picker-servings">Planned servings</Label>
              <Input
                id="picker-servings"
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Math.max(1, parseInt(e.target.value || "1", 10)))}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!selectedId}>
            {existingPlan ? "Save" : "Add meal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
