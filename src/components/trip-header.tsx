import { useSelectedTrip } from "@/lib/selected-trip";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Settings2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TripEditSheet } from "@/components/trip-edit-sheet";

/**
 * Small header shown on the Spese/Pasti tabs that names the currently
 * selected trip and lets the user switch quickly to another one.
 */
export function TripHeader({ label, showEditButton = false }: { label: string; showEditButton?: boolean }) {
  const { selectedTrip, trips, setSelectedTripId } = useSelectedTrip();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (!trips.length) {
    return (
      <div className="mx-4 mb-3 rounded-2xl border border-dashed border-border bg-card p-4 text-center">
        <p className="text-sm text-muted-foreground">Nessuna trasferta disponibile.</p>
        <Link to="/trips" className="mt-2 inline-flex h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs items-center">
          Vai a Trasferte
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-2xl bg-card border border-border px-3.5 py-2.5 active:bg-accent"
      >
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{label}</div>
          <div className="text-sm font-semibold truncate">
            {selectedTrip?.title ?? "Seleziona una trasferta"}
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      {selectedTrip && showEditButton && (
        <button
          type="button"
          data-testid="edit-selected-trip"
          onClick={() => setEditOpen(true)}
          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium h-10 active:opacity-90"
        >
          <Settings2 className="h-4 w-4" /> Modifica trasferta
        </button>
      )}
      {open && (
        <ul className="mt-2 rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {trips.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => { setSelectedTripId(t.id); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3.5 py-2.5 text-sm active:bg-accent",
                  t.id === selectedTrip?.id && "bg-primary/5 font-medium",
                )}
              >
                <div className="truncate">{t.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {t.status === "in_progress" ? "In corso" : t.status === "closed" ? "Conclusa" : "Bozza"}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {editOpen && selectedTrip && (
        <TripEditSheet trip={selectedTrip} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}