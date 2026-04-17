"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { addDays, format, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Plus, X, Users, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDateYMD, toDateKey } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { RecipePickerModal } from "@/components/calendar/recipe-picker-modal";

type MealSlot = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
const SLOTS: MealSlot[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
const SLOT_LABEL: Record<MealSlot, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

type Plan = {
  id: string;
  date: string; // YMD
  slot: MealSlot;
  servings: number;
  recipe: { id: string; title: string };
};

export function CalendarClient({
  recipes,
}: {
  recipes: { id: string; title: string; servings: number; tags: string[] }[];
}) {
  const [weekStart, setWeekStart] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("makanplan-calendar-week");
      if (saved) {
        const d = new Date(saved + "T00:00:00");
        if (!isNaN(d.getTime())) return startOfWeek(d, { weekStartsOn: 1 });
      }
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<{ date: string; slot: MealSlot; plan?: Plan } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<{ recipeId: string; recipeTitle: string; servings: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem("makanplan-calendar-week", formatDateYMD(weekStart));
  }, [weekStart]);

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      start: formatDateYMD(weekStart),
      end: formatDateYMD(weekEnd),
    });
    const res = await fetch(`/api/meal-plans?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setPlans(
        (data.plans as Array<Plan & { date: string }>).map((p) => ({
          ...p,
          date: toDateKey(p.date),
        }))
      );
    }
    setLoading(false);
  }, [weekStart, weekEnd]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const byCell = useMemo(() => {
    const map: Record<string, Plan | undefined> = {};
    for (const p of plans) map[`${p.date}::${p.slot}`] = p;
    return map;
  }, [plans]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    if (!e.over) return;
    const planId = String(e.active.id);
    const [targetDate, targetSlot] = String(e.over.id).split("|") as [string, MealSlot];
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    if (plan.date === targetDate && plan.slot === targetSlot) return;

    // optimistic
    const snapshot = plans;
    setPlans((cur) =>
      cur
        .filter((p) => !(p.date === targetDate && p.slot === targetSlot && p.id !== plan.id))
        .map((p) => (p.id === plan.id ? { ...p, date: targetDate, slot: targetSlot } : p))
    );

    const res = await fetch(`/api/meal-plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: targetDate, slot: targetSlot }),
    });
    if (!res.ok) {
      setPlans(snapshot);
      toast("Failed to move", "error");
    }
  };

  const onRemovePlan = async (plan: Plan) => {
    const snapshot = plans;
    setPlans((cur) => cur.filter((p) => p.id !== plan.id));
    const res = await fetch(`/api/meal-plans/${plan.id}`, { method: "DELETE" });
    if (!res.ok) {
      setPlans(snapshot);
      toast("Failed to remove", "error");
    }
  };

  const onSavePlan = async (opts: {
    date: string;
    slot: MealSlot;
    recipeId: string;
    servings: number;
    existingPlanId?: string;
  }) => {
    if (opts.existingPlanId) {
      const res = await fetch(`/api/meal-plans/${opts.existingPlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: opts.recipeId,
          servings: opts.servings,
        }),
      });
      if (!res.ok) return toast("Failed to save", "error");
    } else {
      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      if (!res.ok) return toast("Failed to add", "error");
    }
    toast("Saved", "success");
    setPicker(null);
    loadPlans();
  };

  const onCopyPlan = (plan: Plan) => {
    setClipboard({ recipeId: plan.recipe.id, recipeTitle: plan.recipe.title, servings: plan.servings });
    toast("Click an empty slot to paste", "success");
  };

  const onPaste = async (date: string, slot: MealSlot) => {
    if (!clipboard) return;
    const res = await fetch("/api/meal-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, slot, recipeId: clipboard.recipeId, servings: clipboard.servings }),
    });
    if (!res.ok) return toast("Failed to paste", "error");
    toast("Meal copied", "success");
    setClipboard(null);
    loadPlans();
  };

  const activePlan = plans.find((p) => p.id === activeDragId);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => addDays(d, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
          Today
        </Button>
        <Button variant="outline" size="icon" onClick={() => setWeekStart((d) => addDays(d, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="font-medium text-muted-foreground ml-2">
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </div>
      </div>

      {clipboard && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-md bg-accent text-accent-foreground text-sm">
          <Copy className="h-4 w-4" />
          <span>Click an empty slot to paste <strong>{clipboard.recipeTitle}</strong></span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setClipboard(null)}>
            Cancel
          </Button>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {/* Mobile: stacked by day */}
        <div className="md:hidden space-y-4">
          {days.map((day) => {
            const ymd = formatDateYMD(day);
            return (
              <Card key={ymd}>
                <CardContent className="p-4">
                  <div className={cn("font-semibold mb-2", isSameDay(day, new Date()) && "text-primary")}>
                    {format(day, "EEE, MMM d")}
                  </div>
                  <div className="space-y-2">
                    {SLOTS.map((slot) => {
                      const plan = byCell[`${ymd}::${slot}`];
                      return (
                        <Cell
                          key={slot}
                          ymd={ymd}
                          slot={slot}
                          plan={plan}
                          clipboard={clipboard}
                          onOpen={() => setPicker({ date: ymd, slot, plan })}
                          onRemove={() => plan && onRemovePlan(plan)}
                          onCopy={() => plan && onCopyPlan(plan)}
                          onPaste={() => onPaste(ymd, slot)}
                        />
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop: 7-column grid */}
        <div className="hidden md:grid grid-cols-[120px_repeat(7,minmax(0,1fr))] border rounded-xl overflow-hidden bg-card">
          <div className="bg-muted/50 border-b"></div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "bg-muted/50 border-b border-l p-2 text-center",
                isSameDay(day, new Date()) && "bg-accent text-accent-foreground"
              )}
            >
              <div className="text-xs uppercase tracking-wide font-semibold">{format(day, "EEE")}</div>
              <div className="text-sm">{format(day, "MMM d")}</div>
            </div>
          ))}

          {SLOTS.map((slot) => (
            <div key={slot} className="contents">
              <div className="border-b p-3 text-sm font-semibold flex items-center bg-background">
                {SLOT_LABEL[slot]}
              </div>
              {days.map((day) => {
                const ymd = formatDateYMD(day);
                const plan = byCell[`${ymd}::${slot}`];
                return (
                  <div key={ymd + slot} className="border-b border-l min-h-[90px] p-2 bg-background">
                    <Cell
                      ymd={ymd}
                      slot={slot}
                      plan={plan}
                      clipboard={clipboard}
                      onOpen={() => setPicker({ date: ymd, slot, plan })}
                      onRemove={() => plan && onRemovePlan(plan)}
                      onCopy={() => plan && onCopyPlan(plan)}
                      onPaste={() => onPaste(ymd, slot)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <DragOverlay>
          {activePlan ? (
            <div className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm shadow-warm-lg">
              {activePlan.recipe.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {loading && <p className="text-center text-muted-foreground text-sm mt-4">Loading…</p>}

      {picker && (
        <RecipePickerModal
          open
          onOpenChange={(o) => !o && setPicker(null)}
          date={picker.date}
          slot={picker.slot}
          existingPlan={picker.plan}
          recipes={recipes}
          onSave={onSavePlan}
        />
      )}
    </>
  );
}

function Cell({
  ymd,
  slot,
  plan,
  clipboard,
  onOpen,
  onRemove,
  onCopy,
  onPaste,
}: {
  ymd: string;
  slot: MealSlot;
  plan: Plan | undefined;
  clipboard: { recipeId: string; recipeTitle: string; servings: number } | null;
  onOpen: () => void;
  onRemove: () => void;
  onCopy: () => void;
  onPaste: () => void;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `${ymd}|${slot}` });
  return (
    <div
      ref={setDropRef}
      className={cn(
        "h-full rounded-md transition-colors",
        isOver && "bg-accent"
      )}
    >
      {plan ? (
        <DraggablePlan plan={plan} onOpen={onOpen} onRemove={onRemove} onCopy={onCopy} />
      ) : clipboard ? (
        <button
          onClick={onPaste}
          className="w-full h-full min-h-[60px] rounded-md border-2 border-dashed border-primary/50 text-primary text-xs flex items-center justify-center hover:border-primary hover:bg-accent"
        >
          <Copy className="h-4 w-4 mr-1" /> Paste
        </button>
      ) : (
        <button
          onClick={onOpen}
          className="w-full h-full min-h-[60px] rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground text-xs flex items-center justify-center hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function DraggablePlan({
  plan,
  onOpen,
  onRemove,
  onCopy,
}: {
  plan: Plan;
  onOpen: () => void;
  onRemove: () => void;
  onCopy: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: plan.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="group relative rounded-md bg-secondary text-secondary-foreground p-2 text-sm shadow-warm hover:bg-accent border cursor-grab active:cursor-grabbing"
    >
      <div {...listeners} {...attributes} onDoubleClick={onOpen} className="min-h-[40px]">
        <Link href={`/recipes/${plan.recipe.id}`} className="font-medium block leading-tight hover:underline">
          {plan.recipe.title}
        </Link>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Users className="h-3 w-3" /> {plan.servings}
        </div>
      </div>
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1">
        <button
          onClick={onCopy}
          className="p-1 rounded bg-background/80 hover:bg-background"
          aria-label="Copy to another slot"
          title="Copy to another slot"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          onClick={onOpen}
          className="p-1 rounded bg-background/80 hover:bg-background"
          aria-label="Edit"
          title="Edit"
        >
          <Plus className="h-3 w-3 rotate-45" />
        </button>
        <button
          onClick={onRemove}
          className="p-1 rounded bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
