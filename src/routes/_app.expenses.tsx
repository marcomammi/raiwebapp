import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteExpense, getExpensesForTrip } from "@/lib/api";
import { eur, expenseTitle, formatDayHeader, categoryIcon } from "@/lib/format";
import { useMemo, useState } from "react";
import { useSelectedTrip } from "@/lib/selected-trip";
import { TripHeader } from "@/components/trip-header";
import { ExpenseEditSheet } from "@/components/expense-edit-sheet";
import { PdfSheet } from "@/components/pdf-sheet";
import { SwipeRow } from "@/components/swipe-row";
import { countsInTotal, sumCountable } from "@/lib/trip-utils";
import type { Expense } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_app/expenses")({
  head: () => ({ meta: [{ title: "Spese" }, { name: "robots", content: "noindex" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { selectedTrip, selectedTripId } = useSelectedTrip();
  const qc = useQueryClient();
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", selectedTripId ?? "none"],
    queryFn: () => (selectedTripId ? getExpensesForTrip(selectedTripId) : Promise.resolve([])),
    enabled: !!selectedTripId,
  });
  const [editing, setEditing] = useState<Expense | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

  const removeExpense = async (e: Expense) => {
    if (!confirm(`Eliminare la spesa "${e.category}" da ${eur(e.amount)}?`)) return;
    const tripId = e.trip_id;
    qc.setQueryData<Expense[]>(["expenses", tripId], (prev) => prev?.filter((x) => x.id !== e.id) ?? prev);
    qc.setQueryData<Expense[]>(["expenses", "all"], (prev) => prev?.filter((x) => x.id !== e.id) ?? prev);
    try {
      await deleteExpense(e.id);
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      toast.success("Spesa eliminata");
    } catch (err) {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.error(err instanceof Error ? err.message : "Errore eliminazione");
    }
  };

  const grouped = useMemo(() => {
    const m = new Map<string, typeof expenses>();
    for (const e of expenses) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [expenses]);

  const total = sumCountable(expenses);
  const hasKmData = useMemo(
    () => expenses.some((e) => e.category === "Carburante" || /\bkm\b/i.test(e.note ?? "")),
    [expenses],
  );

  return (
    <div>
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Spese trasferta</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{eur(total)}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{expenses.length} voci registrate</p>
        </div>
        {selectedTripId && (
          <button
            type="button"
            onClick={() => setPdfOpen(true)}
            className="mt-2 h-10 px-3 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1 active:scale-95 shrink-0"
            aria-label="Distinta PDF"
          >
            <FileText className="h-4 w-4" /> Distinta
          </button>
        )}
      </header>

      <TripHeader label="Trasferta selezionata" showEditButton />

      <div className="px-4 mt-3 space-y-4">
        {grouped.map(([date, items]) => {
          const dayTot = sumCountable(items);
          return (
            <div key={date}>
              <div className="flex items-baseline justify-between px-1 mb-1.5">
                <div className="text-sm font-medium capitalize">{formatDayHeader(date)}</div>
                <div className="text-sm text-muted-foreground tabular-nums">{eur(dayTot)}</div>
              </div>
              <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border bg-card">
                {items.map((e) => {
                  const countable = countsInTotal(e);
                  return (
                    <SwipeRow
                      key={e.id}
                      action={{ label: "Elimina", tone: "danger", onClick: () => removeExpense(e) }}
                    >
                      <button
                        type="button"
                        onClick={() => setEditing(e)}
                        className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-accent"
                      >
                      <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-lg shrink-0">
                        {categoryIcon[e.category]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-sm font-medium truncate", !countable && "text-muted-foreground")}>{expenseTitle(e)}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {!countable ? "azienda" : e.note ?? ""}
                          {countable && e.note ? "" : ""}
                        </div>
                      </div>
                      <div className={cn("text-sm font-semibold tabular-nums shrink-0", !countable && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                        {eur(e.amount)}
                      </div>
                      </button>
                    </SwipeRow>
                  );
                })}
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
      {editing && (
        <ExpenseEditSheet expense={editing} trip={selectedTrip} onClose={() => setEditing(null)} />
      )}
      {pdfOpen && selectedTripId && (
        <PdfSheet tripId={selectedTripId} hasKmData={hasKmData} onClose={() => setPdfOpen(false)} />
      )}
    </div>
  );
}
