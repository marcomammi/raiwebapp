import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FileText, Circle, CheckCircle2, Plus, Settings2 } from "lucide-react";
import { getAllExpenses } from "@/lib/api";
import { eur, formatDate } from "@/lib/format";
import type { Trip, TripStatus } from "@/lib/types";
import { useMemo, useState } from "react";
import { useSelectedTrip } from "@/lib/selected-trip";
import { cn } from "@/lib/utils";
import { countsInTotal } from "@/lib/trip-utils";
import { TripEditSheet } from "@/components/trip-edit-sheet";

export const Route = createFileRoute("/_app/trips")({
  head: () => ({ meta: [{ title: "Trasferte" }, { name: "robots", content: "noindex" }] }),
  component: TripsPage,
});

const STATUS_LABEL: Record<TripStatus, string> = {
  draft: "Bozza",
  in_progress: "In corso",
  closed: "Conclusa",
};
const STATUS_COLOR: Record<TripStatus, string> = {
  draft: "text-muted-foreground bg-muted",
  in_progress: "text-primary bg-primary/10",
  closed: "text-emerald-700 bg-emerald-100",
};

function TripsPage() {
  const { trips, isLoading, selectedTripId, setSelectedTripId, refetch, isError } = useSelectedTrip();
  const navigate = useNavigate();
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses", "all"], queryFn: getAllExpenses });
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const openTrip = (id: string) => {
    setSelectedTripId(id);
    navigate({ to: "/expenses" });
  };

  const totals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      if (!countsInTotal(e)) continue;
      map[e.trip_id] = (map[e.trip_id] ?? 0) + e.amount;
    }
    return map;
  }, [expenses]);

  const inProgress = trips.find((t) => t.status === "in_progress") ?? null;
  const drafts = trips.filter((t) => t.status === "draft");
  const closed = trips.filter((t) => t.status === "closed");

  return (
    <div>
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Il tuo diario</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Trasferte</h1>
        </div>
        <Link
          to="/new-trip"
          className="mt-2 h-10 px-3 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1 active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" /> Nuova
        </Link>
      </header>

      {isLoading ? (
        <div className="px-5 py-10 text-sm text-muted-foreground">Caricamento…</div>
      ) : trips.length === 0 ? (
        <div className="px-4">
          <div className="rounded-2xl bg-card border border-border p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {isError
                ? "Impossibile contattare il sito. Riprova tra poco."
                : "Le trasferte saranno caricate dal sito appena il collegamento dati è attivo."}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => refetch()}
                className="h-10 px-4 rounded-lg border border-border bg-card text-sm"
              >Riprova</button>
              <Link
                to="/new-trip"
                className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center"
              >Nuova trasferta</Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 space-y-6">
          <section>
            <h2 className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">In corso</h2>
            {inProgress ? (
              <TripCard
                trip={inProgress}
                total={totals[inProgress.id] ?? 0}
                selected={inProgress.id === selectedTripId}
                onSelect={() => openTrip(inProgress.id)}
                onEdit={() => setEditingTrip(inProgress)}
                featured
              />
            ) : (
              <div className="rounded-2xl bg-card border border-border px-4 py-6 text-sm text-muted-foreground text-center">
                Nessuna trasferta in corso.
              </div>
            )}
          </section>
          <Section
            title="Trasferte passate"
            trips={closed}
            totals={totals}
            selectedId={selectedTripId}
            onSelect={openTrip}
            onEdit={(t) => setEditingTrip(t)}
            empty="Nessuna trasferta conclusa."
          />
          <Section
            title="Bozze"
            trips={drafts}
            totals={totals}
            selectedId={selectedTripId}
            onSelect={openTrip}
            onEdit={(t) => setEditingTrip(t)}
            empty="Nessuna bozza."
          />
        </div>
      )}
      {editingTrip && (
        <TripEditSheet trip={editingTrip} onClose={() => setEditingTrip(null)} />
      )}
    </div>
  );
}

function Section({ title, trips, totals, selectedId, onSelect, onEdit, empty }: {
  title: string;
  trips: Trip[];
  totals: Record<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (t: Trip) => void;
  empty: string;
}) {
  return (
    <section>
      <h2 className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {trips.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border px-4 py-6 text-sm text-muted-foreground text-center">{empty}</div>
      ) : (
        <ul className="space-y-2">
          {trips.map((t) => (
            <li key={t.id}>
              <TripCard
                trip={t}
                total={totals[t.id] ?? 0}
                selected={t.id === selectedId}
                onSelect={() => onSelect(t.id)}
                onEdit={() => onEdit(t)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TripCard({ trip, total, selected, onSelect, onEdit, featured }: {
  trip: Trip;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  featured?: boolean;
}) {
  const effectiveTotal = typeof trip.spent_total === "number" ? trip.spent_total : total;
  const balance = typeof trip.advance_balance === "number"
    ? trip.advance_balance
    : trip.advance != null ? trip.advance - effectiveTotal : null;
  return (
    <div
      className={cn(
        "w-full flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition",
        featured ? "bg-primary/5 border-primary/30" : "bg-card border-border",
        selected && !featured && "ring-2 ring-primary/40",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 text-left active:opacity-80"
      >
        <div className="flex items-center gap-2">
          <h3 className={cn("truncate font-semibold", featured ? "text-xl" : "text-lg")}>{trip.title}</h3>
          {trip.has_pdf && <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-label="PDF disponibile" />}
          {selected && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" aria-label="Selezionata" />}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">
          {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
          {(trip.city ?? trip.destination) ? ` · ${trip.city ?? trip.destination}` : ""}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLOR[trip.status]}`}>
            <Circle className="h-1.5 w-1.5 fill-current stroke-none" />
            {STATUS_LABEL[trip.status]}
          </span>
          {balance != null && (
            <span className={`text-[10px] font-medium ${balance >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              Saldo {eur(balance)}
            </span>
          )}
        </div>
      </button>
      <div className="text-right shrink-0">
        <div className="text-base font-semibold tabular-nums">{eur(effectiveTotal)}</div>
        <div className="text-[10px] text-muted-foreground">totale</div>
      </div>
      <button
        type="button"
        data-testid="edit-trip-from-list"
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className="shrink-0 h-9 w-9 grid place-items-center rounded-full bg-primary text-primary-foreground active:opacity-90"
        aria-label="Modifica trasferta"
      >
        <Settings2 className="h-4 w-4" />
      </button>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}