import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { X, Plus, Trash2, Upload, FileText, AlertCircle, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { createTrip, parseTravelDocuments, suggestDocumentRole } from "@/lib/api";
import type { PaidBy, TrainSegment, TravelDocument, TravelDocumentRole } from "@/lib/types";
import { useSelectedTrip } from "@/lib/selected-trip";
import { todayISO } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/new-trip")({
  head: () => ({ meta: [{ title: "Nuova trasferta" }, { name: "robots", content: "noindex" }] }),
  component: NewTripPage,
});

function emptyTrain(): TrainSegment {
  return { date: todayISO(), from: "", to: "", amount: 0, paid_by: "employee" };
}

const ROLE_LABEL: Record<TravelDocumentRole, string> = {
  travel_sheet: "Foglio viaggio",
  train_ticket: "Biglietto treno",
  other: "Altro",
};

const uid = () => Math.random().toString(36).slice(2, 10);

function NewTripPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { setSelectedTripId } = useSelectedTrip();

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [travelSheetNumber, setTravelSheetNumber] = useState("");
  const [advance, setAdvance] = useState<string>("");
  const [trains, setTrains] = useState<TrainSegment[]>([]);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parserUnavailable, setParserUnavailable] = useState(false);

  const updateTrain = (i: number, patch: Partial<TrainSegment>) =>
    setTrains((arr) => arr.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const onSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const isFirstBatch = documents.length === 0;
    const added: TravelDocument[] = files.map((f, i) => ({
      id: uid(),
      file: f,
      filename: f.name,
      role: suggestDocumentRole(f.name, isFirstBatch && i === 0),
      status: "idle",
    }));
    setDocuments((arr) => [...arr, ...added]);
    await runParse(added);
  };

  const runParse = async (docs: TravelDocument[]) => {
    if (!docs.length) return;
    const ids = new Set(docs.map((d) => d.id));
    setDocuments((arr) => arr.map((d) => (ids.has(d.id) ? { ...d, status: "parsing", error: undefined } : d)));
    setParsing(true);
    try {
      const res = await parseTravelDocuments(
        docs.map((d) => ({ file: d.file, role: d.role, filename: d.filename, client_id: d.id })),
      );
      setParserUnavailable(false);
      // Precompila trip
      const tf = res.trip_fields;
      if (tf) {
        if (tf.travel_sheet_number && !travelSheetNumber) setTravelSheetNumber(tf.travel_sheet_number);
        if (typeof tf.advance_amount === "number" && !advance) setAdvance(String(tf.advance_amount));
        const dest = tf.destination || tf.city;
        if (dest && !destination) setDestination(dest);
        if (tf.start_date && startDate === todayISO()) setStartDate(tf.start_date);
        if (tf.end_date && endDate === todayISO()) setEndDate(tf.end_date);
        if (tf.notes && !notes) setNotes(tf.notes);
      }
      // Aggiungi tratte
      const segs = res.train_segments ?? [];
      if (segs.length) {
        setTrains((arr) => [...arr, ...segs]);
        toast.success(`${segs.length} tratta/e riconosciute — controlla e salva`);
      }
      setDocuments((arr) =>
        arr.map((d) => (ids.has(d.id) ? { ...d, status: "parsed", error: undefined } : d)),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lettura non disponibile";
      const isUnavailable =
        typeof err === "object" && err !== null && "code" in err &&
        ((err as { code?: string }).code === "network" || (err as { code?: string }).code === "unavailable");
      if (isUnavailable) setParserUnavailable(true);
      setDocuments((arr) => arr.map((d) => (ids.has(d.id) ? { ...d, status: "error", error: msg } : d)));
    } finally {
      setParsing(false);
    }
  };

  const retryParse = () => {
    const pending = documents.filter((d) => d.status !== "parsed");
    if (pending.length) runParse(pending);
  };

  const updateDoc = (id: string, patch: Partial<TravelDocument>) =>
    setDocuments((arr) => arr.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const removeDoc = (id: string) =>
    setDocuments((arr) => arr.filter((d) => d.id !== id));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Inserisci un titolo");
    if (endDate < startDate) return toast.error("Data fine precedente all'inizio");
    setSaving(true);
    try {
      const dest = destination.trim() || undefined;
      const adv = advance.trim() ? Number(advance.replace(",", ".")) : undefined;
      const trip = await createTrip({
        title: title.trim(),
        destination: dest,
        city: dest,
        start_date: startDate,
        end_date: endDate,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        notes: notes.trim() || undefined,
        travel_sheet_number: travelSheetNumber.trim() || undefined,
        advance: Number.isFinite(adv) ? adv : undefined,
        trains: trains.length ? trains : undefined,
      });
      qc.invalidateQueries({ queryKey: ["trips"] });
      setSelectedTripId(trip.id);
      toast.success("Trasferta creata");
      nav({ to: "/trips/$id", params: { id: trip.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between border-b border-border">
        <button onClick={() => nav({ to: "/trips" })} className="h-9 w-9 grid place-items-center -ml-2 rounded-full active:bg-accent" aria-label="Chiudi">
          <X className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">Nuova trasferta</h1>
        <button form="trip-form" type="submit" disabled={saving} className="text-sm font-semibold text-primary disabled:opacity-50 h-9 px-2">
          {saving ? "…" : "Salva"}
        </button>
      </header>

      <form id="trip-form" onSubmit={submit} className="px-4 py-4 space-y-5 max-w-md mx-auto">
        <Field label="Titolo">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Roma 3 giorni" className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base" />
        </Field>

        <Field label="Destinazione">
          <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Città" className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="N. foglio viaggio">
            <input value={travelSheetNumber} onChange={(e) => setTravelSheetNumber(e.target.value)} placeholder="Es. 12345" className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base" />
          </Field>
          <Field label="Anticipo €">
            <input inputMode="decimal" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="0,00" className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data inizio">
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base" />
          </Field>
          <Field label="Data fine">
            <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ora inizio (opz.)">
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base" />
          </Field>
          <Field label="Ora fine (opz.)">
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full h-12 rounded-xl border border-input bg-card px-3 text-base" />
          </Field>
        </div>

        <Field label="Note">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-input bg-card px-3 py-2 text-base" />
        </Field>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Documenti</div>
            <label className={cn("h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1 cursor-pointer", parsing && "opacity-60")}>
              <input type="file" multiple accept=".pdf,image/*" onChange={onSelectFiles} disabled={parsing} className="hidden" />
              <Upload className="h-3.5 w-3.5" /> Carica file
            </label>
          </div>

          {parserUnavailable && (
            <div className="rounded-2xl border border-border bg-accent/40 p-3 text-xs text-foreground/80 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <div>Lettura automatica non disponibile. Puoi completare i dati manualmente e salvare comunque.</div>
                <div className="flex gap-2">
                  <button type="button" onClick={retryParse} className="h-8 px-3 rounded-lg border border-border bg-card text-xs font-medium inline-flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" /> Riprova lettura
                  </button>
                  <button type="button" onClick={() => setTrains((a) => [...a, emptyTrain()])} className="h-8 px-3 rounded-lg border border-border bg-card text-xs font-medium">
                    Inserisci manualmente
                  </button>
                </div>
              </div>
            </div>
          )}

          {documents.length === 0 && !parserUnavailable && (
            <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
              Foglio viaggio, biglietti treno andata/ritorno o un unico PDF multipagina. PDF o foto.
            </div>
          )}

          {documents.map((d) => (
            <div key={d.id} className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.filename}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    {d.status === "parsing" && (<><Loader2 className="h-3 w-3 animate-spin" /> Lettura in corso…</>)}
                    {d.status === "parsed" && (<><CheckCircle2 className="h-3 w-3 text-green-600" /> Letto</>)}
                    {d.status === "error" && (<><AlertCircle className="h-3 w-3 text-amber-600" /> {d.error || "Non letto"}</>)}
                    {d.status === "idle" && <>In attesa</>}
                  </div>
                </div>
                <button type="button" onClick={() => removeDoc(d.id)} className="text-red-600 h-8 w-8 grid place-items-center rounded-full active:bg-accent" aria-label="Rimuovi">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <select
                value={d.role}
                onChange={(e) => updateDoc(d.id, { role: e.target.value as TravelDocumentRole })}
                className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm"
              >
                {(Object.keys(ROLE_LABEL) as TravelDocumentRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
              {d.status === "error" && (
                <button type="button" onClick={() => runParse([d])} className="h-8 px-3 rounded-lg border border-border bg-card text-xs font-medium inline-flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Riprova lettura
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Treni</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setTrains((a) => [...a, emptyTrain()])} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Aggiungi
              </button>
            </div>
          </div>

          {trains.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
              Nessuna tratta. Aggiungi manualmente o carica un biglietto nella sezione Documenti.
            </div>
          )}

          {trains.map((t, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">Tratta #{i + 1}</div>
                <button type="button" onClick={() => setTrains((a) => a.filter((_, idx) => idx !== i))} className="text-red-600 h-8 w-8 grid place-items-center rounded-full active:bg-accent" aria-label="Rimuovi">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Da" value={t.from} onChange={(e) => updateTrain(i, { from: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-2 text-sm" />
                <input placeholder="A" value={t.to} onChange={(e) => updateTrain(i, { to: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-2 text-sm" />
                <input type="date" value={t.date} onChange={(e) => updateTrain(i, { date: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-2 text-sm" />
                <input placeholder="Treno" value={t.train_number ?? ""} onChange={(e) => updateTrain(i, { train_number: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-2 text-sm" />
                <input type="time" placeholder="Partenza" value={t.departure_time ?? ""} onChange={(e) => updateTrain(i, { departure_time: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-2 text-sm" />
                <input type="time" placeholder="Arrivo" value={t.arrival_time ?? ""} onChange={(e) => updateTrain(i, { arrival_time: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-2 text-sm" />
                <input type="text" inputMode="decimal" placeholder="Costo €" value={t.amount ? String(t.amount) : ""} onChange={(e) => updateTrain(i, { amount: Number(e.target.value.replace(",", ".")) || 0 })} className="h-10 rounded-lg border border-input bg-background px-2 text-sm" />
                <select value={t.paid_by} onChange={(e) => updateTrain(i, { paid_by: e.target.value as PaidBy })} className="h-10 rounded-lg border border-input bg-background px-2 text-sm">
                  <option value="employee">Pagato da me</option>
                  <option value="company">Pagato azienda</option>
                </select>
              </div>
              <input placeholder="Note" value={t.note ?? ""} onChange={(e) => updateTrain(i, { note: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-2 text-sm" />
            </div>
          ))}
        </div>
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