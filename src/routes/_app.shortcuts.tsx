import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Check, KeyRound, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import { getStoredAuth } from "@/lib/api";

export const Route = createFileRoute("/_app/shortcuts")({
  head: () => ({ meta: [{ title: "Inserimento rapido" }, { name: "robots", content: "noindex" }] }),
  component: ShortcutsPage,
});

const QUICK_URL =
  "https://raiwebapp.lovable.app/shortcut-api/add-expense?amount=[Importo]&category=[Categoria]";
const ADVANCED_URL = "https://raiwebapp.lovable.app/api-proxy/trips/current/expenses";

function ShortcutsPage() {
  const nav = useNavigate();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = async (key: string, value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(`${label} copiato`);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      toast.error("Copia non riuscita");
    }
  };
  const copyQuick = () => copy("quick", QUICK_URL, "URL rapido");
  const copyAdvanced = () => copy("adv", ADVANCED_URL, "URL avanzato");
  const copyToken = () => {
    const { token } = getStoredAuth();
    if (!token) {
      toast.error("Fai prima login nell'app");
      return;
    }
    void copy("token", token, "Token");
  };
  return (
    <div className="overflow-x-hidden">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex items-center gap-2">
        <button onClick={() => nav({ to: "/profile" })} className="h-9 w-9 grid place-items-center -ml-2 rounded-full active:bg-accent" aria-label="Indietro">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Inserimento rapido</h1>
      </header>
      <div className="px-5 pb-3">
        <p className="text-sm text-muted-foreground">
          Crea un Comando Rapido su iPhone che chiede importo e categoria e chiama in background
          l'endpoint sicuro della webapp. Il tuo token va SOLO nell'header Authorization,
          mai nell'URL.
        </p>
      </div>

      <div className="px-4">
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="text-sm font-semibold mb-2">Metodo consigliato (in background)</div>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-muted-foreground">
            <li>Apri l'app Comandi su iPhone e crea un nuovo comando con <span className="font-medium text-foreground">+</span>.</li>
            <li>Aggiungi <span className="font-medium text-foreground">Chiedi input</span> tipo Numero, domanda: "Importo".</li>
            <li>Aggiungi <span className="font-medium text-foreground">Scegli dal menu</span> con voci: Pranzo, Cena, Colazione, Hotel, City tax, Taxi, Treno, Aereo, Mezzi pubblici, Carburante, Altro.</li>
            <li className="break-words">
              Aggiungi <span className="font-medium text-foreground">Ottieni contenuti URL</span> con questi parametri:
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li className="break-all [overflow-wrap:anywhere]">URL: <span className="font-mono text-foreground">{QUICK_URL}</span></li>
                <li>Metodo: <span className="font-mono text-foreground">GET</span></li>
                <li className="break-all [overflow-wrap:anywhere]">Header: <span className="font-mono text-foreground">Authorization: Bearer &lt;TOKEN&gt;</span></li>
                <li>Nessun corpo. I parametri passano come query string.</li>
              </ul>
            </li>
            <li>Non aggiungere <span className="font-medium text-foreground">Apri URL</span>: resta tutto in background.</li>
            <li>Il token va SOLO nell'header, mai nell'URL.</li>
            <li>Assegna un nome (es. "Aggiungi spesa") e, se vuoi, aggiungilo alla schermata Home.</li>
          </ol>
        </div>
      </div>

      <div className="px-4 mt-3">
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold mb-1">URL rapido</div>
            <div className="rounded-xl bg-muted px-3 py-2.5 text-[12px] font-mono whitespace-pre-wrap break-all [overflow-wrap:anywhere]">{QUICK_URL}</div>
            <button
              onClick={copyQuick}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium active:opacity-90"
            >
              {copiedKey === "quick" ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
              {copiedKey === "quick" ? "Copiato" : "Copia URL rapido"}
            </button>
          </div>
          <div>
            <div className="text-sm font-semibold mb-1">Token sessione</div>
            <p className="text-[11px] text-muted-foreground mb-2">
              Usa questo token come <span className="font-mono">Bearer</span> nell'header
              <span className="font-mono"> Authorization</span> del Comando Rapido.
              Non inserirlo mai nell'URL.
            </p>
            <button
              onClick={copyToken}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium active:bg-accent"
            >
              {copiedKey === "token" ? <Check className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
              {copiedKey === "token" ? "Token copiato" : "Copia token sessione"}
            </button>
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-[11px]">
              Il token è personale: trattalo come una password, non condividerlo e non inserirlo in screenshot.
            </div>
          </div>
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

      <div className="px-4 mt-3">
        <details className="rounded-2xl bg-card border border-border p-4 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Metodo avanzato: POST JSON</summary>
          <p className="mt-2 text-[12px] text-muted-foreground">
            In alternativa puoi usare direttamente il proxy same-origin con metodo POST e corpo JSON.
            Anche qui il token va SOLO nell'header Authorization.
          </p>
          <div className="mt-2 rounded-xl bg-muted px-3 py-2.5 text-[12px] font-mono whitespace-pre-wrap break-all [overflow-wrap:anywhere]">
            {ADVANCED_URL}
          </div>
          <pre className="mt-2 rounded-lg bg-muted p-2 text-[11px] font-mono whitespace-pre-wrap [overflow-wrap:anywhere] text-foreground">{`{
  "category": "Categoria",
  "amount": Importo,
  "date": "YYYY-MM-DD",
  "paid_by": "employee",
  "source": "apple_shortcuts"
}`}</pre>
          <button
            onClick={copyAdvanced}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm active:bg-accent"
          >
            {copiedKey === "adv" ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
            {copiedKey === "adv" ? "Copiato" : "Copia URL avanzato"}
          </button>
        </details>
      </div>

      <div className="h-6" />
    </div>
  );
}