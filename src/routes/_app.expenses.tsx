import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getExpensesForTrip } from "@/lib/api";
import { eur, formatDayHeader, categoryIcon } from "@/lib/format";
import { useMemo } from "react";
import { useSelectedTrip } from "@/lib/selected-trip";
import { TripHeader } from "@/components/trip-header";

export const Route = createFileRoute("/_app/expenses")({
  head: () => ({ meta: [{ title: "Spese" }, { name: "robots", content: "noindex" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { selectedTrip, selectedTripId } = useSelectedTrip();
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", selectedTripId ?? "none"],
    queryFn: () => (selectedTripId ? getExpensesForTrip(selectedTripId) : Promise.resolve([])),
    enabled: !!selectedTripId,
  });

  const grouped = useMemo(() => {
    const m = new Map<string, typeof expenses>();
    for (const e of expenses) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [expenses]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Spese trasferta</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{eur(total)}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{expenses.length} voci registrate</p>
      </header>

      <TripHeader label="Trasferta selezionata" />

      <div className="px-4 mt-3 space-y-4">
        {grouped.map(([date, items]) => {
          const dayTot = items.reduce((s, e) => s + e.amount, 0);
          return (
            <div key={date}>
              <div className="flex items-baseline justify-between px-1 mb-1.5">
                <div className="text-sm font-medium capitalize">{formatDayHeader(date)}</div>
                <div className="text-sm text-muted-foreground tabular-nums">{eur(dayTot)}</div>
              </div>
              <div className="rounded-2xl bg-card border border-border divide-y divide-border">
                {items.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-3.5 py-3">
                    <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-lg shrink-0">
                      {categoryIcon[e.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.category}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {e.note ?? ""}
                      </div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums shrink-0">{eur(e.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {expenses.length === 0 && selectedTrip && (
          <div className="rounded-2xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">
            Nessuna spesa registrata per {selectedTrip.title}.
          </div>
        )}
      </div>
    </div>
  );
}