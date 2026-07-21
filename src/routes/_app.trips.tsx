import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FileText, Circle } from "lucide-react";
import { getTrips, getAllExpenses } from "@/lib/api";
import { eur, formatDate } from "@/lib/format";
import type { Trip, TripStatus } from "@/lib/types";
import { useMemo } from "react";

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
  const { data: trips = [], isLoading } = useQuery({ queryKey: ["trips"], queryFn: getTrips });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses", "all"], queryFn: getAllExpenses });

  const totals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) map[e.trip_id] = (map[e.trip_id] ?? 0) + e.amount;
    return map;
  }, [expenses]);

  const active = trips.filter((t) => t.status !== "closed");
  const closed = trips.filter((t) => t.status === "closed");

  return (
    <div>
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Il tuo diario</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Trasferte</h1>
      </header>

      {isLoading ? (
        <div className="px-5 py-10 text-sm text-muted-foreground">Caricamento…</div>
      ) : (
        <div className="px-4 space-y-6">
          <Section title="In lavorazione" trips={active} totals={totals} empty="Nessuna trasferta attiva." />
          <Section title="Concluse" trips={closed} totals={totals} empty="Nessuna trasferta conclusa." />
        </div>
      )}
    </div>
  );
}

function Section({ title, trips, totals, empty }: {
  title: string;
  trips: Trip[];
  totals: Record<string, number>;
  empty: string;
}) {
  return (
    <section>
      <h2 className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {trips.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border px-4 py-6 text-sm text-muted-foreground text-center">{empty}</div>
      ) : (
        <ul className="space-y-2">
          {trips.map((t) => {
            const total = totals[t.id] ?? 0;
            const balance = t.advance != null ? t.advance - total : null;
            return (
              <li key={t.id}>
                <Link
                  to="/trips/$id"
                  params={{ id: t.id }}
                  className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3.5 active:bg-accent transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{t.title}</h3>
                      {t.has_pdf && <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-label="PDF disponibile" />}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {formatDate(t.start_date)} – {formatDate(t.end_date)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLOR[t.status]}`}>
                        <Circle className="h-1.5 w-1.5 fill-current stroke-none" />
                        {STATUS_LABEL[t.status]}
                      </span>
                      {balance != null && (
                        <span className={`text-[10px] font-medium ${balance >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                          Saldo {eur(balance)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-semibold tabular-nums">{eur(total)}</div>
                    <div className="text-[10px] text-muted-foreground">totale</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}