import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { createCurrentTripExpense, createExpense, getStoredAuth } from "@/lib/api";
import { EXPENSE_CATEGORIES, type ExpenseCategory, type PaidBy } from "@/lib/types";
import { eur } from "@/lib/format";

const searchSchema = z.object({
  amount: z.string().optional(),
  category: z.string().optional(),
  date: z.string().optional(),
  note: z.string().optional(),
  paid_by: z.enum(["employee", "company"]).optional(),
  trip_id: z.string().optional(),
});

export const Route = createFileRoute("/shortcut-expense")({
  head: () => ({
    meta: [{ title: "Aggiungi spesa rapida" }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: ShortcutExpensePage,
});

const CATEGORY_ALIASES: Record<string, ExpenseCategory> = {
  pranzo: "Pranzo",
  lunch: "Pranzo",
  cena: "Cena",
  dinner: "Cena",
  colazione: "Colazione",
  breakfast: "Colazione",
  hotel: "Hotel",
  albergo: "Hotel",
  "city-tax": "City tax",
  "city tax": "City tax",
  citytax: "City tax",
  taxi: "Taxi",
  treno: "Treno",
  train: "Treno",
  aereo: "Aereo",
  flight: "Aereo",
  volo: "Aereo",
  mezzi: "Mezzi pubblici",
  "mezzi-pubblici": "Mezzi pubblici",
  "mezzi pubblici": "Mezzi pubblici",
  bus: "Mezzi pubblici",
  metro: "Mezzi pubblici",
  carburante: "Carburante",
  benzina: "Carburante",
  fuel: "Carburante",
  altro: "Altro",
  other: "Altro",
};

function normalizeCategory(raw?: string): ExpenseCategory | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const exact = EXPENSE_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exact) return exact;
  const alias = CATEGORY_ALIASES[trimmed.toLowerCase()];
  return alias ?? null;
}

function parseAmount(raw?: string): number | null {
  if (!raw) return null;
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type State =
  | { kind: "loading" }
  | { kind: "auth" }
  | { kind: "invalid"; message: string }
  | { kind: "error"; message: string }
  | { kind: "success"; amount: number; category: ExpenseCategory; tripId: string };

function ShortcutExpensePage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { token } = getStoredAuth();
      if (!token) {
        setState({ kind: "auth" });
        return;
      }
      const amount = parseAmount(search.amount);
      if (amount == null) {
        setState({ kind: "invalid", message: "Importo mancante o non valido." });
        return;
      }
      const category = normalizeCategory(search.category);
      if (!category) {
        setState({
          kind: "invalid",
          message: `Categoria non valida${search.category ? `: "${search.category}"` : ""}.`,
        });
        return;
      }
      const payload = {
        category,
        amount,
        date: search.date && /^\d{4}-\d{2}-\d{2}$/.test(search.date) ? search.date : todayIso(),
        note: search.note?.trim() || undefined,
        paid_by: (search.paid_by ?? "employee") as PaidBy,
        source: "apple_shortcuts" as const,
      };
      try {
        const exp = search.trip_id
          ? await createExpense(search.trip_id, payload)
          : await createCurrentTripExpense(payload);
        if (cancelled) return;
        setState({ kind: "success", amount, category, tripId: exp.trip_id });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Errore imprevisto";
        setState({ kind: "error", message: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search.amount, search.category, search.date, search.note, search.paid_by, search.trip_id]);

  const closeOrHome = () => {
    try {
      window.close();
    } catch {
      /* noop */
    }
    // Se la finestra non si chiude (PWA/tab standalone), vai alla lista
    setTimeout(() => nav({ to: "/trips" }), 100);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm">
        {state.kind === "loading" && (
          <div className="text-center text-sm text-muted-foreground">Aggiungo la spesa…</div>
        )}

        {state.kind === "auth" && (
          <div className="rounded-2xl bg-card border border-border p-5 text-center">
            <div className="text-4xl mb-2">🔒</div>
            <h1 className="text-lg font-semibold">Accesso richiesto</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Apri prima l'app e fai login, poi rilancia il comando rapido.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Vai al login
            </Link>
          </div>
        )}

        {state.kind === "invalid" && (
          <div className="rounded-2xl bg-card border border-border p-5 text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <h1 className="text-lg font-semibold">Dati non validi</h1>
            <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
            <button
              onClick={closeOrHome}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium"
            >
              Chiudi
            </button>
          </div>
        )}

        {state.kind === "error" && (
          <div className="rounded-2xl bg-card border border-border p-5 text-center">
            <div className="text-4xl mb-2">😕</div>
            <h1 className="text-lg font-semibold">Non è stato possibile aggiungere</h1>
            <p className="mt-2 text-sm text-muted-foreground break-words">{state.message}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/new-expense"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Inserisci manualmente
              </Link>
              <button
                onClick={closeOrHome}
                className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium"
              >
                Chiudi
              </button>
            </div>
          </div>
        )}

        {state.kind === "success" && (
          <div className="rounded-2xl bg-card border border-border p-5 text-center">
            <div className="text-4xl mb-2">✅</div>
            <h1 className="text-lg font-semibold">Spesa aggiunta</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {state.category} · {eur(state.amount)}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/trips/$id"
                params={{ id: state.tripId }}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Torna alla trasferta
              </Link>
              <button
                onClick={closeOrHome}
                className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium"
              >
                Chiudi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}