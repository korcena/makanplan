"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { addDays, format, startOfWeek, endOfWeek } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatDateYMD } from "@/lib/utils";
import { round1 } from "@/lib/macro-calculator";

type Macro = { calories: number; proteinG: number; carbsG: number; fatG: number };
type Day = {
  date: string;
  bySlot: Record<string, Macro>;
  total: Macro;
};

const SLOT_COLOR: Record<string, string> = {
  BREAKFAST: "bg-yellow-400",
  LUNCH: "bg-orange-400",
  DINNER: "bg-rose-400",
  SNACK: "bg-emerald-400",
};

export function MacrosClient() {
  const today = new Date();
  const [date, setDate] = useState(formatDateYMD(today));
  const [dayData, setDayData] = useState<Day | null>(null);
  const [week, setWeek] = useState<Day[]>([]);
  const [loading, setLoading] = useState(false);

  const weekStart = useMemo(
    () => formatDateYMD(startOfWeek(new Date(date + "T00:00:00"), { weekStartsOn: 1 })),
    [date]
  );
  const weekEnd = useMemo(
    () => formatDateYMD(endOfWeek(new Date(date + "T00:00:00"), { weekStartsOn: 1 })),
    [date]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/macros?start=${weekStart}&end=${weekEnd}`);
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    const days = data.days as Day[];
    setWeek(days);
    setDayData(days.find((d) => d.date === date) ?? null);
  }, [date, weekStart, weekEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const maxDayCalories = Math.max(1, ...week.map((d) => d.total.calories));

  const slots: ("BREAKFAST" | "LUNCH" | "DINNER" | "SNACK")[] = [
    "BREAKFAST",
    "LUNCH",
    "DINNER",
    "SNACK",
  ];

  const dayTotal = dayData?.total ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const dayCaloriesMax = Math.max(
    1,
    ...(dayData ? slots.map((s) => dayData.bySlot[s]?.calories ?? 0) : [0])
  );

  // For stacked chart: build segments per day
  const allDays = useMemo(() => {
    const base = Array.from({ length: 7 }, (_, i) =>
      formatDateYMD(addDays(new Date(weekStart + "T00:00:00"), i))
    );
    return base.map((d) => week.find((w) => w.date === d) ?? {
      date: d,
      bySlot: { BREAKFAST: zero(), LUNCH: zero(), DINNER: zero(), SNACK: zero() },
      total: zero(),
    });
  }, [week, weekStart]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pick a date</CardTitle>
          <CardDescription>See daily macros and weekly trends.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => setDate(formatDateYMD(new Date()))}>
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{format(new Date(date + "T00:00:00"), "EEEE, MMM d")}</CardTitle>
          <CardDescription>Daily totals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 text-center mb-6">
            <StatBox label="Calories" value={round1(dayTotal.calories)} unit="kcal" />
            <StatBox label="Protein" value={round1(dayTotal.proteinG)} unit="g" />
            <StatBox label="Carbs" value={round1(dayTotal.carbsG)} unit="g" />
            <StatBox label="Fat" value={round1(dayTotal.fatG)} unit="g" />
          </div>

          <h3 className="text-sm font-semibold mb-3">Calories by meal</h3>
          <div className="space-y-2">
            {slots.map((s) => {
              const cal = dayData?.bySlot[s]?.calories ?? 0;
              const pct = Math.round((cal / dayCaloriesMax) * 100);
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-muted-foreground">
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </div>
                  <div className="flex-1 h-6 rounded-md bg-muted relative overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${SLOT_COLOR[s]}`}
                      style={{ width: `${cal > 0 ? Math.max(4, pct) : 0}%` }}
                    />
                  </div>
                  <div className="w-20 text-right text-xs tabular-nums">{round1(cal)} kcal</div>
                </div>
              );
            })}
          </div>

          {loading && (
            <p className="text-xs text-muted-foreground mt-4">Loading…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This week</CardTitle>
          <CardDescription>
            Daily calorie totals, stacked by meal slot ({weekStart} to {weekEnd}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-56">
            {allDays.map((d) => {
              const dateObj = new Date(d.date + "T00:00:00");
              const isSelected = d.date === date;
              const totalH = (d.total.calories / maxDayCalories) * 100;
              return (
                <button
                  key={d.date}
                  onClick={() => setDate(d.date)}
                  className={`flex-1 flex flex-col items-center gap-2 group`}
                >
                  <div className="w-full relative h-44">
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-md overflow-hidden border bg-muted/40"
                      style={{ height: `${Math.max(4, totalH)}%` }}
                    >
                      <div className="absolute inset-0 flex flex-col-reverse">
                        {slots.map((s) => {
                          const cal = d.bySlot[s]?.calories ?? 0;
                          const h = d.total.calories > 0 ? (cal / d.total.calories) * 100 : 0;
                          if (cal <= 0) return null;
                          return (
                            <div
                              key={s}
                              className={SLOT_COLOR[s]}
                              style={{ height: `${h}%` }}
                              title={`${s}: ${round1(cal)} kcal`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs ${isSelected ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    {format(dateObj, "EEE")}
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums">
                    {Math.round(d.total.calories)}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 text-xs mt-4">
            {slots.map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`inline-block w-3 h-3 rounded ${SLOT_COLOR[s]}`}></span>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">
        {value} <span className="text-xs font-normal">{unit}</span>
      </div>
    </div>
  );
}

function zero(): Macro {
  return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
}
