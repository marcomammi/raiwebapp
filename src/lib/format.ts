export const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

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