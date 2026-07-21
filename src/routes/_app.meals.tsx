import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAllExpenses, getTrips } from "@/lib/api";
import { eur, formatDayHeader, categoryIcon } from "@/lib/format";
import { MEAL_CATEGORIES } from "@/lib/types";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/meals")({
  head: () => ({ meta: [{ title: "Pasti" }, { name: "robots", content: "noindex" }] }),
  component: MealsPage,
});

function MealsPage() {
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: getTrips });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses", "all"], queryFn: getAllExpenses });

  const activeTrip = trips.find((t) => t.status === "in_progress") ?? trips[0];
  const budget = activeTrip?.meal_budget_daily ?? 46.48;

  const meals = useMemo(
    () => expenses.filter((e) => MEAL_CATEGORIES.includes(e.category) && (!activeTrip || e.trip_id === activeTrip.id)),
    [expenses, activeTrip],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, typeof meals>();
    for (const e of meals) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [meals]);

  const totals = useMemo(() => {
    const total = meals.reduce((s, e) => s + e.amount, 0);
    const days = grouped.length || 1;
    const avg = total / days;
    const diff = budget * days - total;
    return { total, avg, diff, days };
  }, [meals, grouped, budget]);

  return (
    <div>
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pasti</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {activeTrip ? activeTrip.title : "Nessuna trasferta"}
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Budget giornaliero {eur(budget)}</p>
      </header>

      <div className="px-4 grid grid-cols-3 gap-2">
        <MiniStat label="Totale" value={eur(totals.total)} />
        <MiniStat label="Media/g" value={eur(totals.avg)} />
        <MiniStat
          label={totals.diff >= 0 ? "Sotto" : "Sopra"}
          value={eur(Math.abs(totals.diff))}
          tone={totals.diff >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="px-4 mt-5 space-y-4">
        {grouped.length === 0 && (
          <div className="rounded-2xl bg-card border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Nessun pasto registrato.</p>
            <Link to="/new-expense" className="mt-3 inline-flex h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm items-center">
              Aggiungi pasto
            </Link>
          </div>
        )}
        {grouped.map(([date, items]) => {
          const dayTot = items.reduce((s, e) => s + e.amount, 0);
          const over = dayTot > budget;
          const state = items.length === 0 ? "neutral" : over ? "over" : "under";
          return (
            <div key={date}>
              <div className="flex items-baseline justify-between px-1 mb-1.5">
                <div className="text-sm font-medium capitalize">{formatDayHeader(date)}</div>
                <div className={cn(
                  "text-sm font-semibold tabular-nums",
                  state === "over" ? "text-red-600" : state === "under" ? "text-emerald-700" : "text-muted-foreground"
                )}>
                  {eur(dayTot)}
                </div>
              </div>
              <div className={cn(
                "rounded-2xl border bg-card divide-y divide-border",
                state === "over" ? "border-red-200" : state === "under" ? "border-emerald-200" : "border-border"
              )}>
                {items.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-3.5 py-3">
                    <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-lg shrink-0">
                      {categoryIcon[e.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{e.category}</div>
                      {e.note && <div className="text-xs text-muted-foreground truncate">{e.note}</div>}
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{eur(e.amount)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-1 px-1 text-[11px] text-muted-foreground">
                {over ? `Sopra budget di ${eur(dayTot - budget)}` : `Restano ${eur(budget - dayTot)}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  const color = tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-600" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-base font-semibold tabular-nums", color)}>{value}</div>
    </div>
  );
}