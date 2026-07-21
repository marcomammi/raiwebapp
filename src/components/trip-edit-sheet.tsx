import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateTrip, type TripUpdatePayload } from "@/lib/api";
import type { Trip } from "@/lib/types";
import { formatAmountInput, normalizeAmountInput } from "@/lib/format";

interface Props {
  trip: Trip;
  onClose: () => void;
}

function toNum(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function TripEditSheet({ trip, onClose }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(trip.title ?? "");
  const [city, setCity] = useState(trip.city ?? trip.destination ?? "");
  const [startDate, setStartDate] = useState(trip.start_date ?? "");
  const [endDate, setEndDate] = useState(trip.end_date ?? "");
  const [startTime, setStartTime] = useState(trip.start_time ?? "");
  const [endTime, setEndTime] = useState(trip.end_time ?? "");
  const [travelSheet, setTravelSheet] = useState(trip.travel_sheet_number ?? "");
  const [advance, setAdvance] = useState(
    trip.advance != null ? formatAmountInput(trip.advance) : "",
  );
  const [notes, setNotes] = useState(trip.notes ?? "");
  const [busy, setBusy] = useState(false);

  const errors = useMemo(() => {
    const errs: string[] = [];
    if (!title.trim()) errs.push("Il titolo è obbligatorio.");
    if (startDate && endDate && endDate < startDate)
      errs.push("La data di fine non può essere precedente alla data di inizio.");
    const adv = toNum(advance);
    if (adv !== null && (Number.isNaN(adv) || (adv as number) < 0))
      errs.push("L'anticipo deve essere un numero ≥ 0.");
    return errs;
  }, [title, startDate, endDate, advance]);

  const canSave = errors.length === 0 && !busy;

  const save = async () => {
    if (!canSave) return;
    const adv = toNum(advance);
    const payload: TripUpdatePayload = {
      title: title.trim(),
      city: city.trim() || undefined,
      destination: city.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      travel_sheet_number: travelSheet.trim() || undefined,
      advance: adv === null ? undefined : (adv as number),
      notes: notes.trim() || undefined,
    };
    setBusy(true);
    try {
      await updateTrip(trip.id, payload);
      qc.invalidateQueries({ queryKey: ["trip", trip.id] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Impostazioni aggiornate");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md bg-background rounded-t-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background/95 backdrop-blur px-4 pt-4 pb-3 flex items-center justify-between border-b border-border">
          <button
            onClick={onClose}
            className="h-9 w-9 grid place-items-center -ml-2 rounded-full active:bg-accent"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold">Modifica impostazioni</h2>
          <button
            onClick={save}
            disabled={!canSave}
            className="text-sm font-semibold text-primary disabled:opacity-40 h-9 px-2"
          >
            {busy ? "…" : "Salva"}
          </button>
        </div>

        <div className="px-4 py-4 space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Field label="Titolo">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base"
            />
          </Field>

          <Field label="Destinazione / Città">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Es. Roma"
              className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base"
            />
          </Field>

          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
            <Field label="Data inizio">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-w-0 h-12 rounded-xl border border-input bg-card px-3 text-base"
              />
            </Field>
            <Field label="Data fine">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-w-0 h-12 rounded-xl border border-input bg-card px-3 text-base"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
            <Field label="Ora inizio">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full min-w-0 h-12 rounded-xl border border-input bg-card px-3 text-base"
              />
            </Field>
            <Field label="Ora fine">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full min-w-0 h-12 rounded-xl border border-input bg-card px-3 text-base"
              />
            </Field>
          </div>

          <Field label="Numero foglio viaggio">
            <input
              type="text"
              value={travelSheet}
              onChange={(e) => setTravelSheet(e.target.value)}
              placeholder="Facoltativo"
              className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base"
            />
          </Field>

          <Field label="Anticipo (€)">
            <input
              type="text"
              inputMode="decimal"
              value={advance}
              onChange={(e) => setAdvance(e.target.value.replace(/[^\d.,]/g, ""))}
              onBlur={() => setAdvance((v) => (v ? normalizeAmountInput(v) : ""))}
              placeholder="0,00"
              className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base tabular-nums"
            />
          </Field>

          <Field label="Note">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Facoltative"
              rows={3}
              className="w-full rounded-xl border border-input bg-card px-3 py-2 text-base"
            />
          </Field>

          {errors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs space-y-1">
              {errors.map((e) => (
                <div key={e}>• {e}</div>
              ))}
            </div>
          )}
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