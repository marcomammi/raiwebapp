import { createFileRoute } from "@tanstack/react-router";

const BACKEND_URL = "https://rai.marcomammi.com/api/trips/current/expenses";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
} as const;

const CANONICAL_CATEGORIES = [
  "Pranzo", "Cena", "Colazione", "Hotel", "City tax",
  "Taxi", "Treno", "Aereo", "Mezzi pubblici", "Carburante", "Altro",
] as const;

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")            // accenti
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CATEGORY_ALIASES: Record<string, string> = {
  "pranzo": "Pranzo", "lunch": "Pranzo",
  "cena": "Cena", "dinner": "Cena",
  "colazione": "Colazione", "breakfast": "Colazione",
  "hotel": "Hotel", "albergo": "Hotel",
  "city tax": "City tax", "citytax": "City tax", "tassa soggiorno": "City tax", "tassa di soggiorno": "City tax",
  "taxi": "Taxi", "cab": "Taxi",
  "treno": "Treno", "train": "Treno", "trenitalia": "Treno", "italo": "Treno",
  "aereo": "Aereo", "volo": "Aereo", "flight": "Aereo", "plane": "Aereo",
  "mezzi": "Mezzi pubblici", "mezzi pubblici": "Mezzi pubblici",
  "trasporto pubblico": "Mezzi pubblici", "trasporti pubblici": "Mezzi pubblici",
  "bus": "Mezzi pubblici", "autobus": "Mezzi pubblici",
  "metro": "Mezzi pubblici", "metropolitana": "Mezzi pubblici",
  "tram": "Mezzi pubblici",
  "carburante": "Carburante", "benzina": "Carburante", "diesel": "Carburante",
  "gasolio": "Carburante", "fuel": "Carburante", "gas": "Carburante",
  "altro": "Altro", "other": "Altro", "varie": "Altro",
};
for (const c of CANONICAL_CATEGORIES) CATEGORY_ALIASES[slugify(c)] = c;

function normalizeCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = slugify(raw);
  if (!key) return null;
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
  // fallback: partial match sui canonici (es. "mezzi pubblici roma")
  for (const c of CANONICAL_CATEGORIES) {
    const ck = slugify(c);
    if (key === ck || key.startsWith(ck + " ") || key.endsWith(" " + ck) || key.includes(" " + ck + " ")) return c;
  }
  return null;
}

function parseAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function readParams(request: Request): Promise<Record<string, string>> {
  const url = new URL(request.url);
  const out: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { out[k] = v; });
  if (request.method !== "GET") {
    const ct = request.headers.get("content-type") ?? "";
    try {
      if (ct.includes("application/json")) {
        const text = await request.text();
        if (text.trim()) {
          const body = JSON.parse(text) as Record<string, unknown>;
          for (const [k, v] of Object.entries(body ?? {})) if (v != null && out[k] == null) out[k] = String(v);
        }
      } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
        const fd = await request.formData();
        fd.forEach((v, k) => { if (out[k] == null) out[k] = typeof v === "string" ? v : ""; });
      } else {
        // Prova a interpretare come JSON se il body è presente ma senza content-type
        const text = await request.text();
        const trimmed = text.trim();
        if (trimmed.startsWith("{")) {
          try {
            const body = JSON.parse(trimmed) as Record<string, unknown>;
            for (const [k, v] of Object.entries(body ?? {})) if (v != null && out[k] == null) out[k] = String(v);
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }
  // Alias comuni: importo/amt/valore, categoria/cat/tipo
  const alias = (from: string, to: string) => {
    if (out[to] == null && out[from] != null) out[to] = out[from];
  };
  alias("importo", "amount");
  alias("amt", "amount");
  alias("valore", "amount");
  alias("value", "amount");
  alias("price", "amount");
  alias("categoria", "category");
  alias("cat", "category");
  alias("tipo", "category");
  alias("type", "category");
  alias("nota", "note");
  alias("descrizione", "note");
  alias("data", "date");
  return out;
}

async function handle(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (!auth || !/^Bearer\s+.+/i.test(auth)) {
    return json(401, { ok: false, message: "Token mancante: aggiungi l'header Authorization Bearer." });
  }
  const p = await readParams(request);
  // Rifiuta token nei parametri per evitare abusi/log leakage
  if (p.token || p.access_token || p.authorization) {
    return json(400, { ok: false, message: "Non passare il token in URL: usa solo l'header Authorization." });
  }
  const amount = parseAmount(p.amount);
  if (amount == null) return json(400, { ok: false, message: "Importo mancante o non valido." });
  const category = normalizeCategory(p.category);
  if (!category) {
    return json(400, {
      ok: false,
      message: `Categoria non valida${p.category ? `: "${p.category}"` : " (parametro mancante)"}. Accettate: ${CANONICAL_CATEGORIES.join(", ")}.`,
      received: p.category ?? null,
      accepted: CANONICAL_CATEGORIES,
    });
  }
  const date = p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : today();
  const paid_by = p.paid_by === "company" ? "company" : "employee";
  const payload = {
    category,
    amount,
    date,
    note: p.note?.trim() || undefined,
    paid_by,
    source: "apple_shortcuts" as const,
  };
  try {
    const backend = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    const text = await backend.text();
    return new Response(text, {
      status: backend.status,
      headers: {
        "Content-Type": backend.headers.get("content-type") ?? "application/json",
        ...CORS,
      },
    });
  } catch {
    return json(502, { ok: false, message: "Backend non raggiungibile." });
  }
}

export const Route = createFileRoute("/shortcut-api/add-expense")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});