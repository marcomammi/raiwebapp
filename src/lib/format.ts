export const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

/**
 * Formatta un importo per l'input decimale IT: sempre 2 decimali con virgola.
 * Es. 10.5 -> "10,50", 10 -> "10,00".
 */
export const formatAmountInput = (n: number): string =>
  new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(n);

/** Normalizza una stringa importo ("10,5" | "10.5" | "10") -> "10,50". */
export const normalizeAmountInput = (raw: string): string => {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return "";
  const n = Number(s);
  if (!Number.isFinite(n)) return raw;
  return formatAmountInput(n);
};

export const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) =>
  new Date(iso + "T00:00:00").toLocaleDateString("it-IT", opts);

export const formatDayHeader = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const categoryIcon: Record<string, string> = {
  Pranzo: "🍝",
  Cena: "🍽️",
  Colazione: "☕",
  Hotel: "🏨",
  "City tax": "🏛️",
  Taxi: "🚕",
  Treno: "🚄",
  Aereo: "✈️",
  "Mezzi pubblici": "🚌",
  Carburante: "⛽",
  Altro: "🧾",
};