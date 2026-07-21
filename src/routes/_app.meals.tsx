import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getExpensesForTrip } from "@/lib/api";
import { eur, formatDayHeader, categoryIcon } from "@/lib/format";
import { MEAL_CATEGORIES, type Expense } from "@/lib/types";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useSelectedTrip } from "@/lib/selected-trip";
import { TripHeader } from "@/components/trip-header";
import { ExpenseEditSheet } from "@/components/expense-edit-sheet";
import {
  countsInTotal,
  entitlementBudget,
  getEntitlements,
  sumCountable,
} from "@/lib/trip-utils";

export const Route = createFileRoute("/_app/meals")({
  head: () => ({ meta: [{ title: "Pasti" }, { name: "robots", content: "noindex" }] }),
  component: MealsPage,
});

function MealsPage() {
  const { selectedTrip, selectedTripId } = useSelectedTrip();
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", selectedTripId ?? "none"],
    queryFn: () => (selectedTripId ? getExpensesForTrip(selectedTripId) : Promise.resolve([])),
    enabled: !!selectedTripId,
  });
  const [editing, setEditing] = useState<Expense | null>(null);
  const snapshot = selectedTrip?.meal_rules_snapshot;
  const entitlements = getEntitlements(selectedTrip);
  const hasEntitlements = entitlements.length > 0;
  const today = new Date().toISOString().slice(0, 10);
  const elapsedEntitlements = useMemo(
    () => entitlements.filter((e) => e.date <= today),
    [entitlements, today],
  );
  const cityAdjustment =
    selectedTrip?.meal_city_adjustment_applied ??
    snapshot?.city_adjustment_applied ??
    false;
  const cityAdjustmentLabel =
    selectedTrip?.meal_city_adjustment_label ??
    snapshot?.city_adjustment_label ??
    "Maggiorazione città applicata";

  const meals = useMemo(
    () => expenses.filter((e) => MEAL_CATEGORIES.includes(e.category)),
    [expenses],
  );

  // Unione date: entitlements dal backend + eventuali giorni con spese.
  const rows = useMemo(() => {
    const byDate = new Map<string, Expense[]>();
    for (const e of meals) {
      const arr = byDate.get(e.date) ?? [];
      arr.push(e);
      byDate.set(e.date, arr);
    }
    const dates = new Set<string>();
    for (const en of entitlements) dates.add(en.date);
    for (const d of byDate.keys()) dates.add(d);
    return Array.from(dates)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((date) => {
        const items = byDate.get(date) ?? [];
        const en = entitlements.find((x) => x.date === date);
        const dayBudget = en ? entitlementBudget(en) : 0;
        const spent = sumCountable(items);
        return { date, items, entitlement: en, dayBudget, spent };
      });
  }, [meals, entitlements]);

  const totalBudget = hasEntitlements
    ? elapsedEntitlements.reduce((s, e) => s + entitlementBudget(e), 0)
    : 0;
  const totalSpent = sumCountable(meals);
  const diff = totalBudget - totalSpent;
  const daysCount = hasEntitlements
    ? elapsedEntitlements.length
    : rows.filter((r) => r.date <= today).length;
  const avg = daysCount > 0 ? totalSpent / daysCount : 0;

  return (
    <div>
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pasti</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {selectedTrip ? selectedTrip.title : "Nessuna trasferta"}
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {hasEntitlements
            ? `Budget maturato ${eur(totalBudget)} · ${elapsedEntitlements.length}/${entitlements.length} giorni`
            : "Regole pasti non disponibili"}
        </p>
        {hasEntitlements && cityAdjustment && (
          <p className="mt-0.5 text-[11px] font-medium text-primary">{cityAdjustmentLabel}</p>
        )}
      </header>

      <TripHeader label="Trasferta selezionata" />

      <div className="px-4 mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Totale" value={eur(totalSpent)} />
        <MiniStat label="Media/g" value={eur(avg)} />
        <MiniStat
          label={diff >= 0 ? "Sotto" : "Sopra"}
          value={eur(Math.abs(diff))}
          tone={diff >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="px-4 mt-5 space-y-4">
        {rows.length === 0 && (
          <div className="rounded-2xl bg-card border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Nessun pasto registrato.</p>
            <Link to="/new-expense" className="mt-3 inline-flex h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm items-center">
              Aggiungi pasto
            </Link>
          </div>
        )}
        {rows.map(({ date, items, entitlement, dayBudget, spent }) => {
          const hasBudget = dayBudget > 0;
          const over = hasBudget && spent > dayBudget;
          const state = items.length === 0 ? "neutral" : over ? "over" : "under";
          const parts: string[] = [];
          if (entitlement?.lunch_allowed) parts.push(entitlement.lunch_label ?? "Pranzo");
          if (entitlement?.dinner_allowed) parts.push(entitlement.dinner_label ?? "Cena");
          return (
            <div key={date}>
              <div className="flex items-baseline justify-between px-1 mb-1.5">
                <div className="text-sm font-medium capitalize">{formatDayHeader(date)}</div>
                <div className={cn(
                  "text-sm font-semibold tabular-nums",
                  state === "over" ? "text-red-600" : state === "under" ? "text-emerald-700" : "text-muted-foreground"
                )}>
                  {eur(spent)}
                </div>
              </div>
              {entitlement && parts.length > 0 && (
                <div className="px-1 mb-1 text-[11px] text-muted-foreground">
                  Diritto: {parts.join(" + ")} · budget {eur(dayBudget)}
                </div>
              )}
              {entitlement && parts.length === 0 && (
                <div className="px-1 mb-1 text-[11px] text-muted-foreground">
                  Nessun diritto pasti per questo giorno.
                </div>
              )}
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                  {hasBudget ? `Nessun pasto registrato · budget disponibile ${eur(dayBudget)}` : "Nessun pasto registrato."}
                </div>
              ) : (
              <div className={cn(
                "rounded-2xl border bg-card divide-y divide-border",
                state === "over" ? "border-red-200" : state === "under" ? "border-emerald-200" : "border-border"
              )}>
                  {items.map((e) => {
                    const countable = countsInTotal(e);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setEditing(e)}
                        className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-accent"
                      >
                        <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-lg shrink-0">
                          {categoryIcon[e.category]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-sm font-medium", !countable && "text-muted-foreground")}>{e.category}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {!countable ? "azienda" : e.note ?? ""}
                          </div>
                        </div>
                        <div className={cn("text-sm font-semibold tabular-nums", !countable && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                          {eur(e.amount)}
                        </div>
                      </button>
                    );
                  })}
              </div>
              )}
              {hasBudget && items.length > 0 && (
                <div className="mt-1 px-1 text-[11px] text-muted-foreground">
                  {over ? `Sopra budget di ${eur(spent - dayBudget)}` : `Restano ${eur(dayBudget - spent)}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {editing && (
        <ExpenseEditSheet expense={editing} trip={selectedTrip} onClose={() => setEditing(null)} />
      )}
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