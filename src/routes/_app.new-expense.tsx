import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { createExpense, getTrips } from "@/lib/api";
import { useSelectedTrip } from "@/lib/selected-trip";
import { EXPENSE_CATEGORIES, MEAL_CATEGORIES, type Expense, type ExpenseCategory, type MealMode, type PaidBy } from "@/lib/types";
import { hotelNightsNote, isMealAllowed } from "@/lib/trip-utils";
import { categoryIcon, formatAmountInput, normalizeAmountInput, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  trip: z.string().optional(),
  category: z.string().optional(),
  returnTo: z.string().optional(),
});

export const Route = createFileRoute("/_app/new-expense")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Nuova spesa" }, { name: "robots", content: "noindex" }] }),
  component: NewExpensePage,
});

function NewExpensePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const { selectedTripId, setSelectedTripId } = useSelectedTrip();
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: getTrips });
  const returnTo = search.returnTo;
  const defaultTrip = search.trip ?? selectedTripId ?? trips.find((t) => t.status === "in_progress")?.id ?? trips[0]?.id ?? "";
  const [tripId, setTripId] = useState(defaultTrip);
  const [category, setCategory] = useState<ExpenseCategory>(
    (search.category as ExpenseCategory) || "Pranzo",
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [paidBy, setPaidBy] = useState<PaidBy>("employee");
  const [receipt, setReceipt] = useState<string | undefined>(undefined);
  const [forfait, setForfait] = useState(false);
  const [hotelConventioned, setHotelConventioned] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSafeReturn = (p: string | undefined): p is string =>
    !!p && (p === "/expenses" || p === "/meals" || p === "/trips" || p.startsWith("/trips/"));
  const goBack = () => {
    if (isSafeReturn(returnTo)) nav({ to: returnTo as never });
    else nav({ to: "/trips" });
  };

  useEffect(() => {
    if (!tripId && defaultTrip) setTripId(defaultTrip);
  }, [tripId, defaultTrip]);

  const isMeal = MEAL_CATEGORIES.includes(category);
  const isHotel = category === "Hotel";
  const mealType = category === "Pranzo" ? "lunch" : category === "Cena" ? "dinner" : undefined;
  const selectedTrip = trips.find((t) => t.id === tripId);
  const nightsNote = isHotel ? hotelNightsNote(selectedTrip) : "";
  const snapshot = selectedTrip?.meal_rules_snapshot;
  const forfaitAmount = snapshot?.forfait_amount;
  const forfaitAvailable = typeof forfaitAmount === "number" && forfaitAmount > 0;
  const forfaitAmountStr = forfaitAvailable ? formatAmountInput(forfaitAmount) : "";
  const displayedAmount = isMeal && forfait && forfaitAvailable ? forfaitAmountStr : amount;
  const amountLocked = isMeal && forfait;
  const mealCheck = isMeal && mealType ? isMealAllowed(selectedTrip, date, mealType) : null;
  const mealBlocked = mealCheck ? !mealCheck.allowed && mealCheck.hasRules : false;
  const mealMessage = mealBlocked
    ? mealCheck?.entitlement
      ? `${category} non consentito in questa data secondo le regole della trasferta.`
      : "Nessun diritto pasti configurato per questa data."
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mealBlocked) return toast.error(mealMessage!);
    const effective = isMeal && forfait
      ? (forfaitAvailable ? String(forfaitAmount) : "")
      : amount.replace(",", ".");
    if (isMeal && forfait && !forfaitAvailable) {
      return toast.error("Importo forfait non disponibile");
    }
    const n = Number(effective);
    if (!Number.isFinite(n) || n <= 0) return toast.error("Importo non valido");
    const rounded = Math.round(n * 100) / 100;
    if (!tripId) return toast.error("Seleziona una trasferta");
    setSaving(true);
    try {
      const mealMode: MealMode | undefined = isMeal ? (forfait ? "forfait" : "receipt") : undefined;
      const created = await createExpense(tripId, {
        category,
        amount: rounded,
        date,
        note: isHotel ? nightsNote : (note || undefined),
        paid_by: paidBy,
        receipt_url: forfait ? undefined : receipt,
        source: "app",
        meal_mode: mealMode,
        meal_type: mealType,
        ...(isHotel ? { hotel_conventioned: hotelConventioned } : {}),
      });
      setSelectedTripId(tripId);
      // Aggiornamento ottimistico immediato delle cache (dedup su id)
      const pushInto = (key: unknown[]) => {
        qc.setQueryData<Expense[]>(key, (prev) => {
          if (!prev) return [created];
          return prev.some((x) => x.id === created.id) ? prev : [created, ...prev];
        });
      };
      pushInto(["expenses", tripId]);
      pushInto(["expenses", "all"]);
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses", tripId] });
      qc.invalidateQueries({ queryKey: ["expenses", "all"] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      toast.success("Spesa salvata");
      if (isSafeReturn(returnTo)) nav({ to: returnTo as never });
      else nav({ to: "/expenses" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setReceipt(String(reader.result));
    reader.readAsDataURL(f);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between border-b border-border">
        <button onClick={goBack} className="h-9 w-9 grid place-items-center -ml-2 rounded-full active:bg-accent" aria-label="Chiudi">
          <X className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">Nuova spesa</h1>
        <button
          form="expense-form"
          type="submit"
          disabled={saving || mealBlocked}
          className="text-sm font-semibold text-primary disabled:opacity-50 h-9 px-2"
        >
          {saving ? "…" : "Salva"}
        </button>
      </header>

      <form id="expense-form" onSubmit={submit} className="px-4 py-4 space-y-5 max-w-md mx-auto">
        {mealBlocked && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs">
            {mealMessage}
          </div>
        )}
        <div>
          <div className="text-center py-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Importo</div>
            <div className="flex items-baseline justify-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                autoFocus={!amountLocked}
                placeholder="0,00"
                value={displayedAmount}
                readOnly={amountLocked}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                onBlur={() => !amountLocked && setAmount((v) => normalizeAmountInput(v))}
                className={cn(
                  "w-40 text-center text-5xl font-semibold tabular-nums bg-transparent border-0 focus:outline-none",
                  amountLocked && "text-muted-foreground",
                )}
              />
              <span className="text-2xl font-medium text-muted-foreground">€</span>
            </div>
            {isMeal && forfait && (
              <p className={cn("mt-1 text-[11px]", forfaitAvailable ? "text-muted-foreground" : "text-amber-600")}>
                {forfaitAvailable
                  ? "Importo forfait dal backend — non modificabile"
                  : snapshot
                    ? "Importo forfait non disponibile"
                    : "Regole pasti non disponibili"}
              </p>
            )}
          </div>
        </div>

        <Field label="Categoria">
          <div className="grid grid-cols-4 gap-2">
            {EXPENSE_CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "h-16 min-w-0 rounded-2xl border text-[10px] font-medium flex flex-col items-center justify-center gap-1 transition active:scale-[0.97]",
                  category === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground",
                )}
              >
                <span className="text-lg leading-none">{categoryIcon[c]}</span>
                <span className="leading-tight text-center px-0.5 truncate w-full">{c}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Trasferta">
          <select
            value={tripId}
            onChange={(e) => {
              setTripId(e.target.value);
              setSelectedTripId(e.target.value);
            }}
            className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {trips.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
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
                    paidBy === p ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
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
            value={isHotel ? nightsNote : note}
            readOnly={isHotel}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Facoltativa"
            className={cn(
              "w-full h-12 rounded-xl border border-input bg-card px-3 text-base",
              isHotel && "text-muted-foreground",
            )}
          />
          {isHotel && (
            <p className="text-[11px] text-muted-foreground">
              Nota automatica: {nightsNote}. La dicitura convenzionato/non convenzionato viene aggiunta sulla distinta.
            </p>
          )}
        </Field>

        {isHotel && (
          <Field label="Hotel convenzionato">
            <button
              type="button"
              onClick={() => setHotelConventioned((v) => !v)}
              aria-pressed={hotelConventioned}
              className={cn(
                "w-full h-12 rounded-xl border px-4 flex items-center justify-between",
                hotelConventioned ? "bg-primary/10 border-primary/40" : "bg-card border-input",
              )}
            >
              <span className="text-sm">
                {hotelConventioned ? "Convenzionato Rai" : "Non convenzionato (autorizzato)"}
              </span>
              <span className={cn("relative h-7 w-12 rounded-full transition", hotelConventioned ? "bg-primary" : "bg-muted")}>
                <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition", hotelConventioned ? "left-[22px]" : "left-0.5")} />
              </span>
            </button>
            <p className="text-[11px] text-muted-foreground">
              {hotelConventioned
                ? "Annotazione PDF: Pernottamento in hotel convenzionato Rai."
                : "Annotazione PDF: Pernottamento in hotel non convenzionato, autorizzato da ufficio viaggi."}
            </p>
          </Field>
        )}

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

        {!forfait && (
          <Field label="Ricevuta">
            <label className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-3 cursor-pointer">
              <input type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
              {receipt ? (
                <img src={receipt} alt="Ricevuta" className="h-14 w-14 object-cover rounded-lg" />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-muted grid place-items-center text-xl">📷</div>
              )}
              <span className="text-sm text-muted-foreground">
                {receipt ? "Cambia foto" : "Aggiungi foto o ricevuta"}
              </span>
            </label>
          </Field>
        )}
      </form>
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
