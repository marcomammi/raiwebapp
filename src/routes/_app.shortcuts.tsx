import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { categoryIcon } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/types";

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

const SHORTCUT_URL_TEMPLATE =
  "https://raiwebapp.lovable.app/shortcut-expense?amount=[Importo]&category=[Categoria]";

function ShortcutsPage() {
  const nav = useNavigate();
  const [copied, setCopied] = useState(false);
  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(SHORTCUT_URL_TEMPLATE);
      setCopied(true);
      toast.success("Link copiato");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copia non riuscita");
    }
  };
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
          Crea un Comando Rapido su iPhone che chiede importo e categoria e apre un link
          della webapp. La spesa viene aggiunta automaticamente alla trasferta in corso.
        </p>
      </div>

      <div className="px-4">
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="text-sm font-semibold mb-2">Come creare il Comando Rapido</div>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>Apri l'app Comandi su iPhone e tocca <span className="font-medium text-foreground">+</span>.</li>
            <li>Aggiungi l'azione <span className="font-medium text-foreground">Chiedi input</span> tipo Numero, domanda: "Importo".</li>
            <li>Aggiungi <span className="font-medium text-foreground">Scegli dal menu</span> con le categorie qui sotto.</li>
            <li>Aggiungi <span className="font-medium text-foreground">Apri URL</span> con il template qui sotto, sostituendo <span className="font-mono">[Importo]</span> e <span className="font-mono">[Categoria]</span> con le variabili del comando.</li>
            <li>Assegna un nome (es. "Aggiungi spesa") e, se vuoi, aggiungilo alla schermata Home.</li>
          </ol>
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="text-sm font-semibold mb-2">Template URL</div>
          <div className="rounded-xl bg-muted px-3 py-2.5 text-[12px] font-mono break-all">
            {SHORTCUT_URL_TEMPLATE}
          </div>
          <button
            onClick={copyTemplate}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium active:opacity-90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiato" : "Copia link"}
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Parametri opzionali: <span className="font-mono">date=YYYY-MM-DD</span>,{" "}
            <span className="font-mono">note=...</span>,{" "}
            <span className="font-mono">paid_by=employee|company</span>,{" "}
            <span className="font-mono">trip_id=...</span>.
          </p>
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="text-sm font-semibold mb-2">Categorie disponibili</div>
          <div className="flex flex-wrap gap-1.5">
            {EXPENSE_CATEGORIES.map((c) => (
              <span key={c} className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-mono">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        Scorciatoie rapide in-app
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
      <div className="h-6" />
    </div>
  );
}