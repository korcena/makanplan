"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { addDays, format, startOfWeek, endOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { categoryLabel, formatDateYMD } from "@/lib/utils";
import { formatQuantity } from "@/lib/shopping-aggregator";

type Group = {
  category: string;
  items: { key: string; name: string; unit: string; quantity: number; category: string }[];
};

export function ShoppingListClient() {
  const today = new Date();
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(1);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [mealCount, setMealCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem("makanplan-week-start-day");
    const day = stored === "0" ? 0 : 1;
    setWeekStartsOn(day as 0 | 1);
    setStart(formatDateYMD(startOfWeek(today, { weekStartsOn: day as 0 | 1 })));
    setEnd(formatDateYMD(endOfWeek(today, { weekStartsOn: day as 0 | 1 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const storageKey = `makanplan.shopping.${start}.${end}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setChecked(raw ? JSON.parse(raw) : {});
    } catch {
      setChecked({});
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch {
      // ignore quota
    }
  }, [checked, storageKey]);

  const load = useCallback(async () => {
    if (!start || !end) return;
    setLoading(true);
    const params = new URLSearchParams({ start, end });
    const res = await fetch(`/api/shopping-list?${params.toString()}`);
    setLoading(false);
    if (!res.ok) {
      toast("Failed to load", "error");
      return;
    }
    const data = await res.json();
    setGroups(data.groups);
    setMealCount(data.mealCount);
  }, [start, end, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const thisWeek = () => {
    setStart(formatDateYMD(startOfWeek(today, { weekStartsOn })));
    setEnd(formatDateYMD(endOfWeek(today, { weekStartsOn })));
  };
  const nextWeek = () => {
    const s = addDays(startOfWeek(today, { weekStartsOn }), 7);
    setStart(formatDateYMD(s));
    setEnd(formatDateYMD(addDays(s, 6)));
  };

  const toggle = (key: string) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  const allItems = useMemo(() => groups.flatMap((g) => g.items.map((i) => ({ ...i }))), [groups]);
  const checkedCount = allItems.filter((i) => checked[i.key]).length;

  const copy = async () => {
    const lines: string[] = [`Shopping list (${start} to ${end})`, ""];
    for (const g of groups) {
      lines.push(`== ${categoryLabel(g.category)} ==`);
      for (const i of g.items) {
        const box = checked[i.key] ? "[x]" : "[ ]";
        lines.push(`${box} ${formatQuantity(i.quantity)}${i.unit ? " " + i.unit : ""} ${i.name}`);
      }
      lines.push("");
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    toast("Copied to clipboard", "success");
  };

  const print = () => window.print();

  const toggleCollapse = (cat: string) => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }));

  return (
    <div className="space-y-6">
      <Card className="no-print">
        <CardHeader>
          <CardTitle>Date range</CardTitle>
          <CardDescription>Pick a date range to build your shopping list.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
            <div className="space-y-2">
              <Label htmlFor="start">Start</Label>
              <Input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End</Label>
              <Input id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <Button variant="outline" onClick={thisWeek}>This week</Button>
            <Button variant="outline" onClick={nextWeek}>Next week</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {mealCount} meal{mealCount === 1 ? "" : "s"} · {allItems.length} item
            {allItems.length === 1 ? "" : "s"} · {checkedCount} checked
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2 no-print">
        <Button variant="outline" onClick={copy} disabled={allItems.length === 0}>
          <Copy className="h-4 w-4 mr-1" /> Copy
        </Button>
        <Button variant="outline" onClick={print} disabled={allItems.length === 0}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-6">Loading…</p>
      ) : allItems.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <h2 className="text-xl font-semibold">Nothing to shop for yet.</h2>
          <p className="text-muted-foreground mt-1">
            Plan some meals on the calendar and we&apos;ll build a list.
          </p>
        </div>
      ) : (
        <>
          <div className="print:block hidden mb-4">
            <h2 className="text-xl font-semibold">
              Shopping list: {format(new Date(start), "MMM d")} – {format(new Date(end), "MMM d, yyyy")}
            </h2>
          </div>
          <div className="space-y-4">
            {groups.map((g) => {
              const unchecked = g.items.filter((i) => !checked[i.key]);
              const done = g.items.filter((i) => checked[i.key]);
              const isCollapsed = collapsed[g.category];
              return (
                <Card key={g.category}>
                  <CardHeader className="flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">
                      {categoryLabel(g.category)}{" "}
                      <span className="text-muted-foreground font-normal text-sm">
                        ({g.items.length})
                      </span>
                    </CardTitle>
                    <button
                      onClick={() => toggleCollapse(g.category)}
                      className="text-muted-foreground no-print"
                      aria-label={isCollapsed ? "Expand" : "Collapse"}
                    >
                      {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>
                  </CardHeader>
                  {!isCollapsed && (
                    <CardContent>
                      <ul className="space-y-1">
                        {unchecked.map((i) => (
                          <li key={i.key} className="flex items-center gap-3 py-1">
                            <Checkbox
                              id={i.key}
                              checked={!!checked[i.key]}
                              onCheckedChange={() => toggle(i.key)}
                            />
                            <label htmlFor={i.key} className="flex-1 text-sm cursor-pointer">
                              <span className="font-medium tabular-nums">
                                {formatQuantity(i.quantity)}
                              </span>
                              {i.unit && <span className="text-muted-foreground"> {i.unit}</span>}{" "}
                              {i.name}
                            </label>
                          </li>
                        ))}
                        {done.length > 0 && (
                          <li className="pt-2 mt-2 border-t text-xs text-muted-foreground">
                            Checked
                          </li>
                        )}
                        {done.map((i) => (
                          <li key={i.key} className="flex items-center gap-3 py-1 opacity-50">
                            <Checkbox
                              id={i.key}
                              checked
                              onCheckedChange={() => toggle(i.key)}
                            />
                            <label htmlFor={i.key} className="flex-1 text-sm line-through cursor-pointer">
                              <span className="tabular-nums">{formatQuantity(i.quantity)}</span>
                              {i.unit && <span> {i.unit}</span>} {i.name}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
