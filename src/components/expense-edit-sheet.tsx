import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteExpense, updateExpense } from "@/lib/api";
import {
  EXPENSE_CATEGORIES,
  MEAL_CATEGORIES,
  type Expense,
  type ExpenseCategory,
  type MealMode,
  type PaidBy,
  type Trip,
} from "@/lib/types";
import { categoryIcon, formatAmountInput, normalizeAmountInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isMealAllowed } from "@/lib/trip-utils";

/**
 * Restituisce le categorie ammesse per l'id spesa in base al prefisso del
 * record backend, così il PATCH non finisce mai su categorie incompatibili.
 */
function allowedCategoriesFor(id: string): ExpenseCategory[] {
  if (id.startsWith("dest:")) return ["Treno", "Aereo", "Mezzi pubblici"];
  if (id.startsWith("meal:")) {
    const part = id.split(":")[2] ?? id.split(":")[1] ?? "";
    if (part === "lunch" || part === "dinner") return ["Pranzo", "Cena"];
    if (part === "breakfast") return ["Colazione"];
    if (part === "lodging") return ["Hotel"];
  }
  if (id.startsWith("doc:") || id.startsWith("undoc:")) {
    return EXPENSE_CATEGORIES.filter((c) => !MEAL_CATEGORIES.includes(c));
  }
  return [...EXPENSE_CATEGORIES];
}

interface Props {
  expense: Expense;
  trip?: Trip | null;
  onClose: () => void;
}

export function ExpenseEditSheet({ expense, trip, onClose }: Props) {
  const qc = useQueryClient();
  const availableCategories = useMemo(() => allowedCategoriesFor(expense.id), [expense.id]);
  const categoryLocked = availableCategories.length === 1;
  const [category, setCategory] = useState<ExpenseCategory>(expense.category);
  const [amount, setAmount] = useState(formatAmountInput(expense.amount));
  const [date, setDate] = useState(expense.date);
  const [paidBy, setPaidBy] = useState<PaidBy>(expense.paid_by);
  const [note, setNote] = useState(expense.note ?? "");
  const [forfait, setForfait] = useState(expense.meal_mode === "forfait");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);

  const isMeal = MEAL_CATEGORIES.includes(category);
  const mealType = category === "Pranzo" ? "lunch" : category === "Cena" ? "dinner" : undefined;
  const snapshot = trip?.meal_rules_snapshot;
  const forfaitAmount = snapshot?.forfait_amount;
  const forfaitAvailable = typeof forfaitAmount === "number" && forfaitAmount > 0;
  const amountLocked = isMeal && forfait;
  const displayedAmount = amountLocked && forfaitAvailable
    ? formatAmountInput(forfaitAmount)
    : amount;

  const mealCheck = useMemo(
    () => (isMeal && mealType ? isMealAllowed(trip, date, mealType) : null),
    [isMeal, mealType, trip, date],
  );
  const mealBlocked = mealCheck ? !mealCheck.allowed && mealCheck.hasRules : false;
  const mealMessage = mealBlocked
    ? mealCheck?.entitlement
      ? `${category} non consentito in questa data secondo le regole della trasferta.`
      : "Nessun diritto pasti configurato per questa data."
    : null;

  useEffect(() => {
    if (!isMeal) setForfait(false);
  }, [isMeal]);

  // Se la categoria corrente non è tra quelle ammesse dal record backend,
  // riallineala alla prima disponibile per evitare PATCH invalidi.
  useEffect(() => {
    if (!availableCategories.includes(category)) {
      setCategory(availableCategories[0]);
    }
  }, [availableCategories, category]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["expenses", expense.trip_id] });
    qc.invalidateQueries({ queryKey: ["expenses", "all"] });
    qc.invalidateQueries({ queryKey: ["trip", expense.trip_id] });
    qc.invalidateQueries({ queryKey: ["trips"] });
  };

  const save = async () => {
    if (mealBlocked) return toast.error(mealMessage!);
    const effective = amountLocked
      ? (forfaitAvailable ? String(forfaitAmount) : "")
      : amount.replace(",", ".");
    if (amountLocked && !forfaitAvailable) {
      return toast.error("Importo forfait non disponibile");
    }
    const n = Number(effective);
    if (!Number.isFinite(n) || n <= 0) return toast.error("Importo non valido");
    // Normalizza a 2 decimali per riflettere il valore effettivo salvato.
    const rounded = Math.round(n * 100) / 100;
    setAmount(formatAmountInput(rounded));
    setBusy("save");
    try {
      const meal_mode: MealMode | undefined = isMeal ? (forfait ? "forfait" : "receipt") : undefined;
      await updateExpense(expense.id, {
        category,
        amount: rounded,
        date,
        paid_by: paidBy,
        note: note || undefined,
        meal_mode,
        meal_type: mealType,
        receipt_url: forfait ? undefined : expense.receipt_url,
      });
      invalidate();
      toast.success("Spesa aggiornata");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!confirm("Eliminare questa spesa?")) return;
    setBusy("delete");
    try {
      await deleteExpense(expense.id);
      invalidate();
      toast.success("Spesa eliminata");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md bg-background rounded-t-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background/95 backdrop-blur px-4 pt-4 pb-3 flex items-center justify-between border-b border-border">
          <button onClick={onClose} className="h-9 w-9 grid place-items-center -ml-2 rounded-full active:bg-accent" aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold">Modifica spesa</h2>
          <button
            onClick={save}
            disabled={busy !== null || mealBlocked}
            className="text-sm font-semibold text-primary disabled:opacity-40 h-9 px-2"
          >
            {busy === "save" ? "…" : "Salva"}
          </button>
        </div>

        <div className="px-4 py-4 space-y-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="text-center py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Importo</div>
            <div className="flex items-baseline justify-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={displayedAmount}
                readOnly={amountLocked}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                onBlur={() => !amountLocked && setAmount((v) => normalizeAmountInput(v))}
                className={cn(
                  "w-40 text-center text-4xl font-semibold tabular-nums bg-transparent border-0 focus:outline-none",
                  amountLocked && "text-muted-foreground",
                )}
              />
              <span className="text-xl font-medium text-muted-foreground">€</span>
            </div>
            {isMeal && forfait && (
              <p className={cn("mt-1 text-[11px]", forfaitAvailable ? "text-muted-foreground" : "text-amber-600")}>
                {forfaitAvailable
                  ? "Importo forfait dal backend — non modificabile"
                  : snapshot ? "Importo forfait non disponibile" : "Regole pasti non disponibili"}
              </p>
            )}
          </div>

          <Field label="Categoria">
            <div className="grid grid-cols-4 gap-2">
              {availableCategories.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => !categoryLocked && setCategory(c)}
                  disabled={categoryLocked}
                  className={cn(
                    "h-16 min-w-0 rounded-2xl border text-[10px] font-medium flex flex-col items-center justify-center gap-1 transition",
                    category === c ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border",
                    categoryLocked && "opacity-100 cursor-default",
                  )}
                >
                  <span className="text-lg leading-none">{categoryIcon[c]}</span>
                  <span className="leading-tight text-center px-0.5 truncate w-full">{c}</span>
                </button>
              ))}
            </div>
            {categoryLocked ? (
              <p className="text-[11px] text-muted-foreground">
                Categoria fissata dal tipo di record.
              </p>
            ) : availableCategories.length < EXPENSE_CATEGORIES.length ? (
              <p className="text-[11px] text-muted-foreground">
                Solo categorie compatibili con questo record.
              </p>
            ) : null}
          </Field>

          <div className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-3">
            <Field label="Data">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-w-0 h-12 rounded-xl border border-input bg-card px-3 text-sm"
              />
            </Field>
            <Field label="Pagato da">
              <div className="grid grid-cols-2 rounded-xl bg-muted p-1 h-12 text-xs min-w-0">
                {(["employee", "company"] as PaidBy[]).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPaidBy(p)}
                    className={cn(
                      "rounded-lg font-medium min-w-0 truncate",
                      paidBy === p ? "bg-card shadow-sm text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {p === "employee" ? "Dipendente" : "Azienda"}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Nota">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Facoltativa"
              className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base"
            />
          </Field>

          {isMeal && (
            <Field label="Pasto a forfait">
              <button
                type="button"
                onClick={() => setForfait((v) => !v)}
                aria-pressed={forfait}
                className={cn(
                  "w-full h-12 rounded-xl border px-4 flex items-center justify-between",
                  forfait ? "bg-primary/10 border-primary/40" : "bg-card border-input",
                )}
              >
                <span className="text-sm">
                  {forfait ? "Attivo — nessuna ricevuta richiesta" : "Disattivato — spesa con ricevuta"}
                </span>
                <span className={cn("relative h-7 w-12 rounded-full transition", forfait ? "bg-primary" : "bg-muted")}>
                  <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition", forfait ? "left-[22px]" : "left-0.5")} />
                </span>
              </button>
            </Field>
          )}

          {mealBlocked && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs">
              {mealMessage}
            </div>
          )}

          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            className="w-full h-11 rounded-xl border border-red-200 text-red-600 text-sm font-medium disabled:opacity-50"
          >
            {busy === "delete" ? "Eliminazione…" : "Elimina spesa"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}