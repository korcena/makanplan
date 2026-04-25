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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Users,
  Copy,
  Pencil,
  StickyNote,
  UtensilsCrossed,
  Repeat,
} from "lucide-react";
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
  date: string;
  slot: MealSlot;
  servings: number;
  isLeftover: boolean;
  recipe: { id: string; title: string };
};

type Note = {
  id: string;
  date: string;
  slot: MealSlot;
  text: string;
};

type WeekStartDay = 0 | 1;

export function CalendarClient({
  recipes,
}: {
  recipes: { id: string; title: string; servings: number; tags: string[] }[];
}) {
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("makanplan-week-start-day");
      if (saved === "0") return 0;
    }
    return 1;
  });

  const [weekStart, setWeekStart] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("makanplan-calendar-week");
      if (saved) {
        const d = new Date(saved + "T00:00:00");
        if (!isNaN(d.getTime())) return startOfWeek(d, { weekStartsOn: weekStartDay });
      }
    }
    return startOfWeek(new Date(), { weekStartsOn: weekStartDay });
  });

  const [plans, setPlans] = useState<Plan[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<{ date: string; slot: MealSlot; plan?: Plan } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<{
    recipeId: string;
    recipeTitle: string;
    servings: number;
    asLeftover: boolean;
  } | null>(null);
  const [noteInput, setNoteInput] = useState<{ date: string; slot: MealSlot; existingNote?: Note } | null>(null);
  const [noteText, setNoteText] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem("makanplan-calendar-week", formatDateYMD(weekStart));
  }, [weekStart]);

  useEffect(() => {
    localStorage.setItem("makanplan-week-start-day", String(weekStartDay));
  }, [weekStartDay]);

  const changeWeekStartDay = (day: WeekStartDay) => {
    setWeekStartDay(day);
    setWeekStart(startOfWeek(weekStart, { weekStartsOn: day }));
  };

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: weekStartDay }), [weekStart, weekStartDay]);
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      start: formatDateYMD(weekStart),
      end: formatDateYMD(weekEnd),
    });
    const [plansRes, notesRes] = await Promise.all([
      fetch(`/api/meal-plans?${params.toString()}`),
      fetch(`/api/calendar-notes?${params.toString()}`),
    ]);
    if (plansRes.ok) {
      const data = await plansRes.json();
      setPlans(
        (data.plans as Array<Plan & { date: string }>).map((p) => ({
          ...p,
          date: toDateKey(p.date),
        }))
      );
    }
    if (notesRes.ok) {
      const data = await notesRes.json();
      setNotes(
        (data.notes as Array<Note & { date: string }>).map((n) => ({
          ...n,
          date: toDateKey(n.date),
        }))
      );
    }
    setLoading(false);
  }, [weekStart, weekEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const plansByCell = useMemo(() => {
    const map: Record<string, Plan[]> = {};
    for (const p of plans) {
      const key = `${p.date}::${p.slot}`;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return map;
  }, [plans]);

  const notesByCell = useMemo(() => {
    const map: Record<string, Note[]> = {};
    for (const n of notes) {
      const key = `${n.date}::${n.slot}`;
      if (!map[key]) map[key] = [];
      map[key].push(n);
    }
    return map;
  }, [notes]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    if (!e.over) return;
    const planId = String(e.active.id);
    const [targetDate, targetSlot] = String(e.over.id).split("|") as [string, MealSlot];
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    if (plan.date === targetDate && plan.slot === targetSlot) return;

    const snapshot = plans;
    setPlans((cur) =>
      cur.map((p) => (p.id === plan.id ? { ...p, date: targetDate, slot: targetSlot } : p))
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
        body: JSON.stringify({ recipeId: opts.recipeId, servings: opts.servings }),
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
    loadData();
  };

  const onCopyAsMeal = (plan: Plan) => {
    setClipboard({
      recipeId: plan.recipe.id,
      recipeTitle: plan.recipe.title,
      servings: plan.servings,
      asLeftover: false,
    });
    toast("Click any slot to paste as meal", "success");
  };

  const onCopyAsLeftover = (plan: Plan) => {
    setClipboard({
      recipeId: plan.recipe.id,
      recipeTitle: plan.recipe.title,
      servings: plan.servings,
      asLeftover: true,
    });
    toast("Click any slot to paste as leftover", "success");
  };

  const onPaste = async (date: string, slot: MealSlot) => {
    if (!clipboard) return;
    const res = await fetch("/api/meal-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        slot,
        recipeId: clipboard.recipeId,
        servings: clipboard.servings,
        isLeftover: clipboard.asLeftover,
      }),
    });
    if (!res.ok) return toast("Failed to paste", "error");
    toast(clipboard.asLeftover ? "Leftover added" : "Meal copied", "success");
    setClipboard(null);
    loadData();
  };

  const onAddNote = (date: string, slot: MealSlot) => {
    setNoteInput({ date, slot });
    setNoteText("");
  };

  const onEditNote = (note: Note) => {
    setNoteInput({ date: note.date, slot: note.slot, existingNote: note });
    setNoteText(note.text);
  };

  const onSaveNote = async () => {
    if (!noteInput || !noteText.trim()) return;
    if (noteInput.existingNote) {
      const res = await fetch(`/api/calendar-notes/${noteInput.existingNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteText.trim() }),
      });
      if (!res.ok) return toast("Failed to save note", "error");
    } else {
      const res = await fetch("/api/calendar-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: noteInput.date, slot: noteInput.slot, text: noteText.trim() }),
      });
      if (!res.ok) return toast("Failed to add note", "error");
    }
    setNoteInput(null);
    setNoteText("");
    loadData();
  };

  const onRemoveNote = async (note: Note) => {
    const snapshot = notes;
    setNotes((cur) => cur.filter((n) => n.id !== note.id));
    const res = await fetch(`/api/calendar-notes/${note.id}`, { method: "DELETE" });
    if (!res.ok) {
      setNotes(snapshot);
      toast("Failed to remove note", "error");
    }
  };

  const activePlan = plans.find((p) => p.id === activeDragId);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekStart((d) => addDays(d, -7))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: weekStartDay }))}
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekStart((d) => addDays(d, 7))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="font-medium text-muted-foreground ml-2">
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs">
          <span className="text-muted-foreground mr-1">Start:</span>
          <Button
            variant={weekStartDay === 1 ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => changeWeekStartDay(1)}
          >
            Mon
          </Button>
          <Button
            variant={weekStartDay === 0 ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => changeWeekStartDay(0)}
          >
            Sun
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs mb-4">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-secondary border" />
          Meal
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" />
          Leftover
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-blue-50 border border-blue-200" />
          Note
        </div>
      </div>

      {clipboard && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-md bg-accent text-accent-foreground text-sm">
          {clipboard.asLeftover ? (
            <Repeat className="h-4 w-4 shrink-0" />
          ) : (
            <Copy className="h-4 w-4 shrink-0" />
          )}
          <span>
            Click any slot to paste <strong>{clipboard.recipeTitle}</strong>
            {clipboard.asLeftover && " as leftover"}
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setClipboard(null)}>
            Cancel
          </Button>
        </div>
      )}

      {noteInput && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-sm">
          <StickyNote className="h-4 w-4 shrink-0 text-blue-600" />
          <input
            className="flex-1 bg-transparent border-b border-blue-300 outline-none text-sm px-1 py-0.5"
            placeholder="Type a note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveNote();
              if (e.key === "Escape") setNoteInput(null);
            }}
            autoFocus
          />
          <Button size="sm" className="h-7" onClick={onSaveNote} disabled={!noteText.trim()}>
            Save
          </Button>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setNoteInput(null)}>
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
                    {SLOTS.map((slot) => (
                      <Cell
                        key={slot}
                        ymd={ymd}
                        slot={slot}
                        plans={plansByCell[`${ymd}::${slot}`] ?? []}
                        notes={notesByCell[`${ymd}::${slot}`] ?? []}
                        clipboard={clipboard}
                        onOpen={(plan) => setPicker({ date: ymd, slot, plan })}
                        onRemove={onRemovePlan}
                        onCopyAsMeal={onCopyAsMeal}
                        onCopyAsLeftover={onCopyAsLeftover}
                        onPaste={() => onPaste(ymd, slot)}
                        onAddNote={() => onAddNote(ymd, slot)}
                        onEditNote={onEditNote}
                        onRemoveNote={onRemoveNote}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop: 7-column grid */}
        <div className="hidden md:grid grid-cols-[120px_repeat(7,minmax(0,1fr))] border rounded-xl overflow-hidden bg-card">
          <div className="bg-muted/50 border-b" />
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
                return (
                  <div key={ymd + slot} className="border-b border-l min-h-[90px] p-2 bg-background">
                    <Cell
                      ymd={ymd}
                      slot={slot}
                      plans={plansByCell[`${ymd}::${slot}`] ?? []}
                      notes={notesByCell[`${ymd}::${slot}`] ?? []}
                      clipboard={clipboard}
                      onOpen={(plan) => setPicker({ date: ymd, slot, plan })}
                      onRemove={onRemovePlan}
                      onCopyAsMeal={onCopyAsMeal}
                      onCopyAsLeftover={onCopyAsLeftover}
                      onPaste={() => onPaste(ymd, slot)}
                      onAddNote={() => onAddNote(ymd, slot)}
                      onEditNote={onEditNote}
                      onRemoveNote={onRemoveNote}
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
  plans,
  notes,
  clipboard,
  onOpen,
  onRemove,
  onCopyAsMeal,
  onCopyAsLeftover,
  onPaste,
  onAddNote,
  onEditNote,
  onRemoveNote,
}: {
  ymd: string;
  slot: MealSlot;
  plans: Plan[];
  notes: Note[];
  clipboard: { recipeId: string; recipeTitle: string; servings: number; asLeftover: boolean } | null;
  onOpen: (plan?: Plan) => void;
  onRemove: (plan: Plan) => void;
  onCopyAsMeal: (plan: Plan) => void;
  onCopyAsLeftover: (plan: Plan) => void;
  onPaste: () => void;
  onAddNote: () => void;
  onEditNote: (note: Note) => void;
  onRemoveNote: (note: Note) => void;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `${ymd}|${slot}` });
  return (
    <div
      ref={setDropRef}
      className={cn("h-full rounded-md transition-colors space-y-1", isOver && "bg-accent/50")}
    >
      {plans.map((plan) => (
        <DraggablePlan
          key={plan.id}
          plan={plan}
          onOpen={() => onOpen(plan)}
          onRemove={() => onRemove(plan)}
          onCopyAsMeal={() => onCopyAsMeal(plan)}
          onCopyAsLeftover={() => onCopyAsLeftover(plan)}
        />
      ))}
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onEdit={() => onEditNote(note)} onRemove={() => onRemoveNote(note)} />
      ))}
      <div className="flex gap-1">
        {clipboard ? (
          <button
            onClick={onPaste}
            className="flex-1 min-h-[28px] rounded-md border-2 border-dashed border-primary/50 text-primary text-xs flex items-center justify-center gap-1 hover:border-primary hover:bg-accent"
          >
            <Copy className="h-3 w-3" /> Paste
          </button>
        ) : (
          <>
            <button
              onClick={() => onOpen()}
              className="flex-1 min-h-[28px] rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground text-xs flex items-center justify-center gap-1 hover:border-primary hover:text-primary"
              title="Add meal"
            >
              <UtensilsCrossed className="h-3 w-3" />
            </button>
            <button
              onClick={onAddNote}
              className="min-h-[28px] px-2 rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground text-xs flex items-center justify-center hover:border-blue-400 hover:text-blue-500"
              title="Add note"
            >
              <StickyNote className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DraggablePlan({
  plan,
  onOpen,
  onRemove,
  onCopyAsMeal,
  onCopyAsLeftover,
}: {
  plan: Plan;
  onOpen: () => void;
  onRemove: () => void;
  onCopyAsMeal: () => void;
  onCopyAsLeftover: () => void;
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
      className={cn(
        "group relative rounded-md p-2 text-sm shadow-warm border cursor-grab active:cursor-grabbing",
        plan.isLeftover
          ? "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
          : "bg-secondary text-secondary-foreground hover:bg-accent"
      )}
    >
      <div {...listeners} {...attributes} onDoubleClick={onOpen} className="min-h-[32px] pr-14">
        <div className="flex items-center gap-1">
          {plan.isLeftover && <Repeat className="h-3 w-3 text-amber-500 shrink-0" />}
          <Link
            href={`/recipes/${plan.recipe.id}`}
            className="font-medium block leading-tight hover:underline truncate"
          >
            {plan.recipe.title}
          </Link>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <Users className="h-3 w-3" /> {plan.servings}
          {plan.isLeftover && (
            <span className="text-amber-600 font-medium ml-1">leftover</span>
          )}
        </div>
      </div>
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-0.5">
        <button
          onClick={onCopyAsMeal}
          className="p-1 rounded bg-background/80 hover:bg-background"
          aria-label="Copy as meal"
          title="Copy as meal"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          onClick={onCopyAsLeftover}
          className="p-1 rounded bg-background/80 hover:bg-amber-100"
          aria-label="Add as leftover"
          title="Add as leftover"
        >
          <Repeat className="h-3 w-3" />
        </button>
        <button
          onClick={onOpen}
          className="p-1 rounded bg-background/80 hover:bg-background"
          aria-label="Edit"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={onRemove}
          className="p-1 rounded bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
          aria-label="Remove"
          title="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function NoteCard({
  note,
  onEdit,
  onRemove,
}: {
  note: Note;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group relative rounded-md bg-blue-50 text-blue-900 border border-blue-200 p-2 text-xs">
      <div className="flex items-start gap-1 pr-10">
        <StickyNote className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />
        <span className="leading-tight">{note.text}</span>
      </div>
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-0.5">
        <button
          onClick={onEdit}
          className="p-1 rounded bg-white/80 hover:bg-white"
          aria-label="Edit note"
          title="Edit note"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={onRemove}
          className="p-1 rounded bg-white/80 hover:bg-destructive hover:text-destructive-foreground"
          aria-label="Remove note"
          title="Remove note"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
