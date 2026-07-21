import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, MoreHorizontal, FileText, Settings2, Pencil } from "lucide-react";
import { getTrip, getExpensesForTrip } from "@/lib/api";
import { eur, formatDate, formatDayHeader, categoryIcon } from "@/lib/format";
import { MEAL_CATEGORIES, type Expense } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSelectedTrip } from "@/lib/selected-trip";
import { ExpenseEditSheet } from "@/components/expense-edit-sheet";
import { PdfSheet } from "@/components/pdf-sheet";
import { TripEditSheet } from "@/components/trip-edit-sheet";
import {
  countsInTotal,
  entitlementBudget,
  getEntitlements,
  sumCountable,
  totalMealBudget,
} from "@/lib/trip-utils";
import type { Trip } from "@/lib/types";

export const Route = createFileRoute("/_app/trips/$id")({
  head: () => ({ meta: [{ title: "Dettaglio trasferta" }, { name: "robots", content: "noindex" }] }),
  component: TripDetail,
});

type Tab = "all" | "meals" | "docs" | "summary";

function TripDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pdfSheet, setPdfSheet] = useState(false);
  const [settingsSheet, setSettingsSheet] = useState(false);
  const { setSelectedTripId } = useSelectedTrip();

  useEffect(() => { setSelectedTripId(id); }, [id, setSelectedTripId]);

  const { data: trip } = useQuery({ queryKey: ["trip", id], queryFn: () => getTrip(id) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses", id], queryFn: () => getExpensesForTrip(id) });
  const [editing, setEditing] = useState<Expense | null>(null);

  const stats = useMemo(() => {
    const clientTotal = sumCountable(expenses);
    const total = typeof trip?.spent_total === "number" ? trip.spent_total : clientTotal;
    const meals = expenses.filter((e) => MEAL_CATEGORIES.includes(e.category));
    const mealTotal = sumCountable(meals);
    const entitlements = getEntitlements(trip);
    const budgetTotal = totalMealBudget(trip);
    const days = entitlements.length || new Set(meals.map((e) => e.date)).size || 1;
    const diff = budgetTotal - mealTotal;
    return { total, mealTotal, budgetTotal, diff, days, hasEntitlements: entitlements.length > 0 };
  }, [expenses, trip]);

  const hasKmData = useMemo(
    () => expenses.some((e) => e.category === "Carburante" || /\bkm\b/i.test(e.note ?? "")),
    [expenses],
  );

  const openPdf = () => setPdfSheet(true);

  if (!trip) {
    return <div className="px-5 py-10 text-sm text-muted-foreground">Caricamento…</div>;
  }

  const balance = typeof trip.advance_balance === "number"
    ? trip.advance_balance
    : trip.advance != null ? trip.advance - stats.total : null;

  return (
    <div>
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex items-center gap-2">
        <button onClick={() => nav({ to: "/trips" })} className="h-9 w-9 grid place-items-center -ml-2 rounded-full active:bg-accent" aria-label="Indietro">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0" />
        <button
          onClick={() => setSettingsSheet(true)}
          className="h-9 px-3 rounded-full border border-border bg-card text-sm font-medium flex items-center gap-1.5 active:bg-accent"
          aria-label="Modifica trasferta"
        >
          <Pencil className="h-4 w-4" /> Modifica
        </button>
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="h-9 w-9 grid place-items-center rounded-full active:bg-accent" aria-label="Menu">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-48 rounded-xl border border-border bg-popover shadow-lg z-20 overflow-hidden text-sm">
              <button
                onClick={() => { setMenuOpen(false); openPdf(); }}
                className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-accent"
              >
                <FileText className="h-4 w-4" /> Genera PDF
              </button>
              <button
                onClick={() => { setMenuOpen(false); setSettingsSheet(true); }}
                className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-accent"
              >
                <Settings2 className="h-4 w-4" /> Modifica impostazioni
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="px-5">
        <h1 className="text-3xl font-semibold tracking-tight truncate">{trip.title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
          {(trip.city ?? trip.destination) ? ` · ${trip.city ?? trip.destination}` : ""}
        </p>

        <div
          data-ui-version="trip-edit-card-v2"
          className="mt-4 rounded-2xl border border-border bg-card p-4 flex items-center gap-3 shadow-sm"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
            <Settings2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Impostazioni trasferta</div>
            <div className="text-[11px] text-muted-foreground truncate">
              Nome, località, date, orari, anticipo e budget pasti
            </div>
          </div>
          <button
            type="button"
            data-testid="edit-trip-settings"
            onClick={() => setSettingsSheet(true)}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5 active:scale-[0.98] shadow-sm shrink-0"
          >
            <Pencil className="h-4 w-4" /> Modifica
          </button>
        </div>

        {trip.status === "closed" && (
          <div className="mt-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-3 py-2 text-xs">
            Trasferta conclusa{trip.closed_at ? ` il ${formatDate(trip.closed_at)}` : ""}.
          </div>
        )}
      </div>

      <div className="px-4 mt-5 grid grid-cols-2 gap-2">
        <StatCard label="Totale spese" value={eur(stats.total)} accent />
        <StatCard
          label={stats.hasEntitlements ? `Budget pasti (${stats.days}g)` : "Budget pasti"}
          value={stats.hasEntitlements ? eur(stats.budgetTotal) : "—"}
        />
        <StatCard
          label={stats.diff >= 0 ? "Sotto budget" : "Sopra budget"}
          value={stats.hasEntitlements ? eur(Math.abs(stats.diff)) : "—"}
          tone={stats.diff >= 0 ? "positive" : "negative"}
        />
        {trip.advance != null && balance != null && (
          <StatCard
            label={balance >= 0 ? "Residuo anticipo" : "Da rimborsare"}
            value={eur(Math.abs(balance))}
            tone={balance >= 0 ? "positive" : "negative"}
          />
        )}
      </div>

      <div className="mt-5 px-4">
        <div className="grid grid-cols-4 rounded-xl bg-muted p-1 text-xs">
          {(["all", "meals", "docs", "summary"] as Tab[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "py-2 rounded-lg font-medium transition",
                tab === k ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              {k === "all" ? "Tutte" : k === "meals" ? "Pasti" : k === "docs" ? "Documenti" : "Riepilogo"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">
        {tab === "all" && <ExpensesList expenses={expenses} tripId={id} onEdit={setEditing} />}
        {tab === "meals" && <MealsList expenses={expenses} trip={trip} onEdit={setEditing} />}
        {tab === "docs" && <DocsList expenses={expenses} onGenerate={openPdf} hasKmData={hasKmData} />}
        {tab === "summary" && <SummaryView expenses={expenses} advance={trip.advance} onGenerate={openPdf} hasKmData={hasKmData} />}
      </div>

      {pdfSheet && (
        <PdfSheet tripId={id} hasKmData={hasKmData} onClose={() => setPdfSheet(false)} />
      )}
      {editing && (
        <ExpenseEditSheet expense={editing} trip={trip} onClose={() => setEditing(null)} />
      )}
      {settingsSheet && (
        <TripEditSheet trip={trip} onClose={() => setSettingsSheet(false)} />
      )}
    </div>
  );
}

function StatCard({ label, value, tone, accent }: { label: string; value: string; tone?: "positive" | "negative"; accent?: boolean }) {
  const color =
    tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-600" : "text-foreground";
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-3.5", accent && "col-span-2")}>
      <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-semibold tabular-nums", accent ? "text-3xl" : "text-xl", color)}>{value}</div>
    </div>
  );
}

function ExpensesList({ expenses, tripId, onEdit }: { expenses: Expense[]; tripId: string; onEdit: (e: Expense) => void }) {
  if (expenses.length === 0)
    return <EmptyState tripId={tripId} text="Nessuna spesa ancora inserita." />;
  const grouped = groupByDate(expenses);
  return (
    <div className="space-y-4">
      {grouped.map(([date, items]) => (
        <DayGroup key={date} date={date} items={items}>
          {items.map((e) => (
            <ExpenseRow key={e.id} e={e} onClick={() => onEdit(e)} />
          ))}
        </DayGroup>
      ))}
    </div>
  );
}

function MealsList({ expenses, trip, onEdit }: { expenses: Expense[]; trip: Trip; onEdit: (e: Expense) => void }) {
  const meals = expenses.filter((e) => MEAL_CATEGORIES.includes(e.category));
  const entitlements = getEntitlements(trip);
  const byDate = new Map<string, Expense[]>();
  for (const e of meals) {
    const arr = byDate.get(e.date) ?? [];
    arr.push(e);
    byDate.set(e.date, arr);
  }
  const dates = new Set<string>();
  for (const en of entitlements) dates.add(en.date);
  for (const d of byDate.keys()) dates.add(d);
  const rows = Array.from(dates).sort((a, b) => (a < b ? 1 : -1));
  if (rows.length === 0)
    return <div className="rounded-2xl bg-card border border-border p-6 text-sm text-muted-foreground text-center">Nessun pasto registrato.</div>;
  return (
    <div className="space-y-4">
      {rows.map((date) => {
        const items = byDate.get(date) ?? [];
        const en = entitlements.find((x) => x.date === date);
        const dayBudget = en ? entitlementBudget(en) : 0;
        const dayTotal = sumCountable(items);
        const hasBudget = dayBudget > 0;
        const over = hasBudget && dayTotal > dayBudget;
        const parts: string[] = [];
        if (en?.lunch_allowed) parts.push(en.lunch_label ?? "Pranzo");
        if (en?.dinner_allowed) parts.push(en.dinner_label ?? "Cena");
        return (
          <div key={date}>
            <div className="flex items-baseline justify-between px-1 mb-1.5">
              <div className="text-sm font-medium capitalize">{formatDayHeader(date)}</div>
              <div className={cn("text-sm font-semibold tabular-nums", over ? "text-red-600" : items.length ? "text-emerald-700" : "text-muted-foreground")}>{eur(dayTotal)}</div>
            </div>
            {en && parts.length > 0 && (
              <div className="px-1 mb-1 text-[11px] text-muted-foreground">
                Diritto: {parts.join(" + ")} · budget {eur(dayBudget)}
              </div>
            )}
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                {hasBudget ? `Nessun pasto registrato · disponibile ${eur(dayBudget)}` : "Nessun pasto registrato."}
              </div>
            ) : (
              <div className="rounded-2xl bg-card border border-border divide-y divide-border">
                {items.map((e) => <ExpenseRow key={e.id} e={e} compact onClick={() => onEdit(e)} />)}
              </div>
            )}
            {hasBudget && items.length > 0 && (
              <div className="mt-1 px-1 text-[11px] text-muted-foreground">
                {over ? `Sopra di ${eur(dayTotal - dayBudget)}` : `Restano ${eur(dayBudget - dayTotal)}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DocsList({ expenses, onGenerate, hasKmData }: { expenses: Expense[]; onGenerate: () => void; hasKmData: boolean }) {
  const withReceipts = expenses.filter((e) => e.receipt_url);
  return (
    <div className="space-y-3">
      <button
        onClick={onGenerate}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 active:scale-[0.99]"
      >
        <FileText className="h-4 w-4" /> Genera PDF{hasKmData ? " (distinta + scheda km)" : " distinta"}
      </button>
      {withReceipts.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-6 text-sm text-muted-foreground text-center">
          Nessuna ricevuta allegata.
        </div>
      ) : (
        <ul className="rounded-2xl bg-card border border-border divide-y divide-border">
          {withReceipts.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0 text-sm truncate">{e.category} · {formatDate(e.date)}</div>
              <div className="text-sm tabular-nums">{eur(e.amount)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryView({ expenses, advance, onGenerate, hasKmData }: { expenses: Expense[]; advance?: number; onGenerate: () => void; hasKmData: boolean }) {
  const sumBy = (cats: string[]) => sumCountable(expenses.filter((e) => cats.includes(e.category)));
  const rows = [
    { label: "Pasti", value: sumBy(MEAL_CATEGORIES) },
    { label: "Pernottamento", value: sumBy(["Hotel", "City tax"]) },
    { label: "Trasporti", value: sumBy(["Treno", "Aereo", "Taxi", "Mezzi pubblici"]) },
    { label: "Carburante", value: sumBy(["Carburante"]) },
    { label: "Altro", value: sumBy(["Altro"]) },
  ];
  const total = sumCountable(expenses);
  const balance = advance != null ? advance - total : null;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
            <span className="text-sm">{r.label}</span>
            <span className="text-sm tabular-nums font-medium">{eur(r.value)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3 bg-muted">
          <span className="text-sm font-semibold">Totale</span>
          <span className="text-base tabular-nums font-semibold">{eur(total)}</span>
        </div>
        {advance != null && (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm">Anticipo</span>
              <span className="text-sm tabular-nums">{eur(advance)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm font-medium">Saldo</span>
              <span className={cn("text-sm font-semibold tabular-nums", (balance ?? 0) >= 0 ? "text-emerald-700" : "text-red-600")}>{eur(balance ?? 0)}</span>
            </div>
          </>
        )}
      </div>
      <button
        onClick={onGenerate}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2"
      >
        <FileText className="h-4 w-4" /> Genera PDF{hasKmData ? " (distinta + scheda km)" : ""}
      </button>
    </div>
  );
}

function groupByDate(expenses: Expense[]): Array<[string, Expense[]]> {
  const map = new Map<string, Expense[]>();
  for (const e of expenses) {
    if (!map.has(e.date)) map.set(e.date, []);
    map.get(e.date)!.push(e);
  }
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function DayGroup({ date, items, children }: { date: string; items: Expense[]; children: React.ReactNode }) {
  const total = items.reduce((s, e) => s + e.amount, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between px-1 mb-1.5">
        <div className="text-sm font-medium capitalize">{formatDayHeader(date)}</div>
        <div className="text-sm font-semibold tabular-nums text-muted-foreground">{eur(total)}</div>
      </div>
      <div className="rounded-2xl bg-card border border-border divide-y divide-border">{children}</div>
    </div>
  );
}

function ExpenseRow({ e, onClick, compact }: { e: Expense; onClick?: () => void; compact?: boolean }) {
  const countable = countsInTotal(e);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-accent"
    >
      <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-lg shrink-0">
        {categoryIcon[e.category] ?? "•"}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium truncate", !countable && "text-muted-foreground")}>{e.category}</div>
        {e.note && <div className="text-xs text-muted-foreground truncate">{e.note}</div>}
      </div>
      <div className="text-right shrink-0">
        <div className={cn("text-sm font-semibold tabular-nums", !countable && "text-muted-foreground line-through decoration-muted-foreground/40")}>{eur(e.amount)}</div>
        <div className="text-[10px] text-muted-foreground">
          {e.paid_by === "employee" ? "dipendente" : "azienda"}
          {e.sync === "pending" && " · sync…"}
          {e.sync === "error" && " · errore"}
        </div>
      </div>
      {!compact && <span className="text-[10px] text-muted-foreground">›</span>}
    </button>
  );
}

function EmptyState({ tripId, text }: { tripId: string; text: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link
        to="/new-expense"
        search={{ trip: tripId } as never}
        className="mt-3 inline-flex h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm items-center"
      >Aggiungi spesa</Link>
    </div>
  );
}