import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { categoryIcon } from "@/lib/format";

export const Route = createFileRoute("/_app/shortcuts")({
  head: () => ({ meta: [{ title: "Inserimento rapido" }, { name: "robots", content: "noindex" }] }),
  component: ShortcutsPage,
});

const ACTIONS: { key: string; category: string; label: string }[] = [
  { key: "lunch", category: "Pranzo", label: "Aggiungi pranzo" },
  { key: "dinner", category: "Cena", label: "Aggiungi cena" },
  { key: "taxi", category: "Taxi", label: "Aggiungi taxi" },
  { key: "fuel", category: "Carburante", label: "Aggiungi carburante" },
  { key: "other", category: "Altro", label: "Aggiungi spesa generica" },
];

function ShortcutsPage() {
  const nav = useNavigate();
  return (
    <div>
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex items-center gap-2">
        <button onClick={() => nav({ to: "/profile" })} className="h-9 w-9 grid place-items-center -ml-2 rounded-full active:bg-accent" aria-label="Indietro">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Inserimento rapido</h1>
      </header>
      <div className="px-5 pb-3">
        <p className="text-sm text-muted-foreground">
          Queste azioni sono pronte per essere collegate a Comandi Rapidi Apple. La scorciatoia
          chiede solo importo e categoria: la spesa viene aggiunta automaticamente alla
          trasferta in corso tramite <span className="font-mono">POST /trips/current/expenses</span>.
        </p>
      </div>
      <div className="px-4 grid grid-cols-1 gap-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.key}
            to="/new-expense"
            search={{ category: a.category } as never}
            className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3.5 active:bg-accent"
          >
            <div className="h-10 w-10 rounded-full bg-muted grid place-items-center text-xl shrink-0">
              {categoryIcon[a.category]}
            </div>
            <div className="flex-1 text-sm font-medium">{a.label}</div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Shortcut</span>
          </Link>
        ))}
      </div>
      <div className="px-5 mt-6">
        <div className="rounded-2xl border border-dashed border-border p-4 text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-all">
{`POST /api/trips/current/expenses
{
  "category": "Pranzo",
  "amount": 18.50,
  "date": "2026-07-21",
  "note": "Pranzo in trasferta",
  "paid_by": "employee",
  "source": "apple_shortcuts"
}`}
        </div>
      </div>
    </div>
  );
}