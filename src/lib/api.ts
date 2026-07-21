// Central API client. Currently mocked, but written to mirror the real
// endpoints exposed by the remote backend so the wiring can be swapped
// by only replacing the fetch implementations below.
//
// Real endpoints (future):
//   POST   /api/login
//   GET    /api/me
//   POST   /api/logout
//   GET    /api/admin/users
//   POST   /api/admin/users
//   PATCH  /api/admin/users/:id
//   DELETE /api/admin/users/:id
//   POST   /api/access-requests
//   GET    /api/trips
//   GET    /api/trips/:id
//   POST   /api/trips/:id/expenses
//   PATCH  /api/expenses/:id
//   DELETE /api/expenses/:id
//   GET    /api/trips/:id/meal-budget
//   PATCH  /api/trips/:id/meal-budget
//   POST   /api/trips/:id/generate-pdf

import {
  ALLOWED_EMAIL_DOMAIN,
  API_BASE_URL as CFG_API_BASE_URL,
  DEV_MOCK_TRIPS,
  SELF_REGISTRATION_ENABLED,
  isAllowedEmail,
} from "./config";
import type {
  AppUser,
  Expense,
  ExpenseCategory,
  MealMode,
  MealType,
  PaidBy,
  ParsedTravelDocumentsResult,
  TravelDocument,
  TravelDocumentRole,
  TrainSegment,
  Trip,
  TripStatus,
  UserProfile,
  UserRole,
  UserStatus,
} from "./types";

export const API_BASE_URL = CFG_API_BASE_URL;

const LS_TOKEN = "app.token";
const LS_USER = "app.user";
const LS_TRIPS = "app.mock.trips";
const LS_EXPENSES = "app.mock.expenses";

const isBrowser = () => typeof window !== "undefined";
const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

// ---------- storage helpers (mock only) ----------
function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(val));
}

// ---------- HTTP helpers ----------
class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function authHeaders(): Record<string, string> {
  if (!isBrowser()) return {};
  const t = localStorage.getItem(LS_TOKEN);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeaders(),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("Servizio non raggiungibile", 0, "network");
  }
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    let msg = "";
    if (body && typeof body === "object" && "message" in body) {
      const m = (body as { message: unknown }).message;
      if (typeof m === "string") msg = m;
    }
    if (!msg) {
      msg = res.status === 401 ? "Credenziali non valide"
        : res.status === 403 ? "Accesso negato"
        : res.status === 404 ? "Risorsa non trovata"
        : "Errore del server";
    }
    throw new ApiError(msg, res.status);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}

// ---------- seed ----------
function seed() {
  if (!isBrowser() || !DEV_MOCK_TRIPS) return;
  if (localStorage.getItem(LS_TRIPS)) return;
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };

  const trips: Trip[] = [
    { id: "t1", title: "Roma 7", destination: "Roma", start_date: iso(daysAgo(3)), end_date: iso(daysAgo(-2)), status: "in_progress", advance: 400, meal_budget_daily: 46.48, has_pdf: false },
    { id: "t2", title: "Milano 4", destination: "Milano", start_date: iso(daysAgo(20)), end_date: iso(daysAgo(17)), status: "closed", closed_at: iso(daysAgo(15)), advance: 300, meal_budget_daily: 46.48, has_pdf: true },
    { id: "t3", title: "Napoli 2", destination: "Napoli", start_date: iso(daysAgo(40)), end_date: iso(daysAgo(38)), status: "draft", meal_budget_daily: 46.48 },
  ];

  const t1d0 = iso(daysAgo(3));
  const t1d1 = iso(daysAgo(2));
  const t1d2 = iso(daysAgo(1));
  const expenses: Expense[] = [
    { id: "e1", trip_id: "t1", category: "Treno", amount: 89.9, date: t1d0, paid_by: "company", note: "Frecciarossa AV", sync: "synced", source: "app" },
    { id: "e2", trip_id: "t1", category: "Hotel", amount: 142, date: t1d0, paid_by: "company", note: "Hotel centro", sync: "synced", source: "app" },
    { id: "e3", trip_id: "t1", category: "Pranzo", amount: 18.5, date: t1d0, paid_by: "employee", sync: "synced", source: "app" },
    { id: "e4", trip_id: "t1", category: "Cena", amount: 32, date: t1d0, paid_by: "employee", note: "Trattoria", sync: "synced", source: "app" },
    { id: "e5", trip_id: "t1", category: "Colazione", amount: 4.5, date: t1d1, paid_by: "employee", sync: "synced", source: "app" },
    { id: "e6", trip_id: "t1", category: "Pranzo", amount: 22, date: t1d1, paid_by: "employee", sync: "synced", source: "app" },
    { id: "e7", trip_id: "t1", category: "Cena", amount: 28.5, date: t1d1, paid_by: "employee", sync: "synced", source: "app" },
    { id: "e8", trip_id: "t1", category: "Taxi", amount: 14, date: t1d1, paid_by: "employee", sync: "synced", source: "app" },
    { id: "e9", trip_id: "t1", category: "Pranzo", amount: 24, date: t1d2, paid_by: "employee", sync: "synced", source: "app" },
    { id: "e10", trip_id: "t2", category: "Hotel", amount: 220, date: iso(daysAgo(19)), paid_by: "company", sync: "synced", source: "app" },
    { id: "e11", trip_id: "t2", category: "Cena", amount: 35, date: iso(daysAgo(19)), paid_by: "employee", sync: "synced", source: "app" },
    { id: "e12", trip_id: "t2", category: "Carburante", amount: 62, date: iso(daysAgo(18)), paid_by: "employee", note: "Rifornimento auto aziendale (250 km)", sync: "synced", source: "app" },
  ];

  write(LS_TRIPS, trips);
  write(LS_EXPENSES, expenses);
}

function ensureSeed() { seed(); }

const uid = () => Math.random().toString(36).slice(2, 10);

function toProfile(u: AppUser): UserProfile {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    employeeNumber: u.employeeNumber,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    default_meal_budget: 46.48,
    name: `${u.firstName} ${u.lastName}`.trim(),
    matricola: u.employeeNumber,
  };
}

function normalizeUser(raw: Record<string, unknown>): AppUser {
  const s = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");
  const firstName = s("firstName") || s("first_name") || s("nome") || "";
  const lastName = s("lastName") || s("last_name") || s("cognome") || "";
  const employeeNumber = s("employeeNumber") || s("employee_number") || s("matricola") || "";
  const role: UserRole = (raw.role === "admin" ? "admin" : "user");
  const status: UserStatus = (raw.status === "disabled" ? "disabled" : "active");
  return {
    id: s("id") || uid(),
    email: s("email"),
    firstName,
    lastName,
    employeeNumber,
    role,
    status,
    createdAt: s("createdAt") || s("created_at") || new Date().toISOString(),
  };
}

// ---------- auth ----------
export interface LoginResult {
  token: string;
  user: UserProfile;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const em = email.trim().toLowerCase();
  if (!em || !password) throw new Error("Email e password obbligatorie");
  const data = await apiFetch<{ token: string; user: Record<string, unknown> }>("/login", {
    method: "POST",
    body: JSON.stringify({ email: em, password }),
  });
  if (!data?.token || !data?.user) throw new Error("Risposta del server non valida");
  const appUser = normalizeUser(data.user);
  if (appUser.status === "disabled") throw new Error("Utente disattivato. Contatta un amministratore.");
  const profile = toProfile(appUser);
  if (isBrowser()) {
    localStorage.setItem(LS_TOKEN, data.token);
    localStorage.setItem(LS_USER, JSON.stringify(profile));
  }
  return { token: data.token, user: profile };
}

export async function logout(): Promise<void> {
  if (!isBrowser()) return;
  try { await apiFetch("/logout", { method: "POST" }); } catch { /* best effort */ }
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const { token } = getStoredAuth();
  if (!token) return null;
  try {
    const raw = await apiFetch<Record<string, unknown>>("/me");
    const profile = toProfile(normalizeUser(raw));
    if (isBrowser()) localStorage.setItem(LS_USER, JSON.stringify(profile));
    return profile;
  } catch {
    return getStoredAuth().user;
  }
}

export function getStoredAuth(): { token: string | null; user: UserProfile | null } {
  if (!isBrowser()) return { token: null, user: null };
  const token = localStorage.getItem(LS_TOKEN);
  const raw = localStorage.getItem(LS_USER);
  return { token, user: raw ? (JSON.parse(raw) as UserProfile) : null };
}

// ---------- admin: users ----------
export interface UserPayload {
  email: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  role: UserRole;
  status: UserStatus;
}

function assertAllowedEmail(email: string) {
  if (!isAllowedEmail(email)) {
    throw new Error(`Email non ammessa. Usa un indirizzo @${ALLOWED_EMAIL_DOMAIN}.`);
  }
}

export async function getUsers(): Promise<AppUser[]> {
  const raw = await apiFetch<Record<string, unknown>[]>("/admin/users");
  return raw.map(normalizeUser).sort((a, b) => a.email.localeCompare(b.email));
}

export async function createUser(payload: UserPayload): Promise<AppUser> {
  const email = payload.email.trim().toLowerCase();
  assertAllowedEmail(email);
  if (!payload.firstName.trim() || !payload.lastName.trim()) throw new Error("Nome e cognome sono obbligatori.");
  if (!payload.employeeNumber.trim()) throw new Error("Matricola obbligatoria.");
  const raw = await apiFetch<Record<string, unknown>>("/admin/users", {
    method: "POST",
    body: JSON.stringify({ ...payload, email }),
  });
  return normalizeUser(raw);
}

export async function updateUser(id: string, payload: Partial<UserPayload>): Promise<AppUser> {
  if (payload.email !== undefined) assertAllowedEmail(payload.email.trim().toLowerCase());
  const raw = await apiFetch<Record<string, unknown>>(`/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalizeUser(raw);
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---------- future self-registration (disabled) ----------
export interface AccessRequestPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  employeeNumber?: string;
  note?: string;
}

export async function requestAccess(payload: AccessRequestPayload): Promise<{ queued: boolean }> {
  assertAllowedEmail(payload.email.trim().toLowerCase());
  void SELF_REGISTRATION_ENABLED;
  try {
    await apiFetch<void>("/access-requests", {
      method: "POST",
      body: JSON.stringify({ ...payload, email: payload.email.trim().toLowerCase() }),
    });
    return { queued: true };
  } catch (err) {
    if (err instanceof ApiError && err.code === "network") {
      throw new Error("Servizio non raggiungibile. Riprova più tardi.");
    }
    throw err;
  }
}

// ---------- trips ----------
export async function getTrips(): Promise<Trip[]> {
  if (DEV_MOCK_TRIPS) {
    ensureSeed();
    await delay(150);
    const trips = read<Trip[]>(LS_TRIPS, []);
    return [...trips].sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  }
  const raw = await apiFetch<Trip[]>("/trips");
  return [...raw].map(normalizeTrip).sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
}

export async function getCurrentTrip(): Promise<Trip | null> {
  if (DEV_MOCK_TRIPS) {
    ensureSeed();
    await delay(120);
    const t = read<Trip[]>(LS_TRIPS, []).find((x) => x.status === "in_progress");
    return t ?? null;
  }
  try {
    const t = await apiFetch<Trip>("/trips/current");
    return normalizeTrip(t);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// Il backend può usare `closed`, `completed`, `archived` come stati "passati":
// li normalizziamo tutti su `closed` per la lista "Trasferte passate".
function normalizeTrip(t: Trip): Trip {
  const raw = t as unknown as Record<string, unknown>;
  const st = String(raw.status ?? t.status ?? "").toLowerCase();
  let status: TripStatus = t.status;
  if (st === "in_progress" || st === "in-progress" || st === "open" || st === "active") status = "in_progress";
  else if (st === "draft") status = "draft";
  else if (st === "closed" || st === "completed" || st === "archived" || st === "done") status = "closed";
  return { ...t, status };
}

export async function getTrip(id: string): Promise<Trip | null> {
  if (DEV_MOCK_TRIPS) {
    ensureSeed();
    await delay(120);
    return read<Trip[]>(LS_TRIPS, []).find((t) => t.id === id) ?? null;
  }
  try {
    const t = await apiFetch<Trip>(`/trips/${encodeURIComponent(id)}`);
    return normalizeTrip(t);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// ---------- create trip ----------
export interface TripPayload {
  title: string;
  destination?: string;
  city?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  trains?: TrainSegment[];
  travel_sheet_number?: string;
  advance?: number;
  meal_budget_daily?: number;
}

export async function createTrip(payload: TripPayload): Promise<Trip> {
  const t = await apiFetch<Trip>("/trips", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeTrip(t);
}

export type TripUpdatePayload = Partial<TripPayload>;

/**
 * Aggiorna le impostazioni di una trasferta esistente.
 * Backend reale: PATCH /trips/:id
 * Mock: aggiorna direttamente LS_TRIPS con i campi forniti.
 */
export async function updateTrip(tripId: string, payload: TripUpdatePayload): Promise<Trip> {
  if (DEV_MOCK_TRIPS) {
    await delay(150);
    const trips = read<Trip[]>(LS_TRIPS, []);
    const idx = trips.findIndex((t) => t.id === tripId);
    if (idx < 0) throw new Error("Trasferta non trovata");
    const prev = trips[idx];
    const next: Trip = {
      ...prev,
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.destination !== undefined ? { destination: payload.destination } : {}),
      ...(payload.city !== undefined ? { city: payload.city } : {}),
      ...(payload.start_date !== undefined ? { start_date: payload.start_date } : {}),
      ...(payload.end_date !== undefined ? { end_date: payload.end_date } : {}),
      ...(payload.start_time !== undefined ? { start_time: payload.start_time } : {}),
      ...(payload.end_time !== undefined ? { end_time: payload.end_time } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      ...(payload.travel_sheet_number !== undefined ? { travel_sheet_number: payload.travel_sheet_number } : {}),
      ...(payload.advance !== undefined ? { advance: payload.advance } : {}),
      ...(payload.meal_budget_daily !== undefined ? { meal_budget_daily: payload.meal_budget_daily } : {}),
    };
    trips[idx] = next;
    write(LS_TRIPS, trips);
    return next;
  }
  const t = await apiFetch<Trip>(`/trips/${encodeURIComponent(tripId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalizeTrip(t);
}

// ---------- travel document parsing (train tickets etc.) ----------
export interface TravelDocumentUpload {
  file: File;
  role: TravelDocumentRole;
  filename?: string;
  client_id?: string;
  /** Testo estratto lato client via OCR/pdfjs; se presente il file può essere omesso. */
  client_text?: string;
}

/**
 * Batch parsing di documenti di viaggio (foglio viaggio + biglietti treno).
 * Endpoint: POST /api/travel-documents/parse (multipart/form-data).
 * Invia tutti i file come `files[]` + un JSON `metadata` con ruolo/filename/index.
 * Il backend può rispondere con `trip_fields`, `train_segments`, `expenses`, `documents`.
 * Se il parser non è raggiungibile o l'endpoint non è ancora attivo, lancia
 * un ApiError con code "network" o "unavailable": l'UI mostra un fallback
 * neutro e mantiene i file per il completamento manuale.
 */
export async function parseTravelDocuments(
  uploads: TravelDocumentUpload[],
): Promise<ParsedTravelDocumentsResult> {
  if (!uploads.length) return {};
  const form = new FormData();
  const metadata = uploads.map((u, i) => ({
    index: i,
    filename: u.filename ?? u.file.name,
    role: u.role,
    client_id: u.client_id,
    has_client_text: !!(u.client_text && u.client_text.length),
  }));
  uploads.forEach((u) => {
    const name = u.filename ?? u.file.name;
    // Il backend accetta client_texts[] + client_filenames[]: allega il file
    // solo quando l'OCR locale non ha prodotto testo utile.
    if (u.client_text && u.client_text.length) {
      form.append("client_texts[]", u.client_text);
      form.append("client_filenames[]", name);
    } else {
      form.append("files[]", u.file, name);
      form.append("client_texts[]", "");
      form.append("client_filenames[]", name);
    }
  });
  form.append("metadata", JSON.stringify(metadata));

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/travel-documents/parse`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: form,
    });
  } catch {
    throw new ApiError("Lettura automatica non disponibile", 0, "network");
  }
  if (res.status === 404 || res.status === 501 || res.status === 503) {
    throw new ApiError("Lettura automatica non disponibile", res.status, "unavailable");
  }
  if (!res.ok) {
    throw new ApiError(
      res.status === 415 ? "Formato non supportato" : "Impossibile leggere i documenti",
      res.status,
    );
  }
  const data = (await res.json().catch(() => null)) as ParsedTravelDocumentsResult | null;
  if (!data || typeof data !== "object") return {};
  return {
    trip_fields: data.trip_fields,
    train_segments: Array.isArray(data.train_segments) ? data.train_segments : [],
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    documents: Array.isArray(data.documents) ? data.documents : [],
    raw: data,
  };
}

/** Suggerisce un ruolo iniziale in base al nome file e alla posizione. */
export function suggestDocumentRole(filename: string, isFirst: boolean): TravelDocumentRole {
  const n = filename.toLowerCase();
  if (/(treno|train|ticket|biglietto|frecc|italo|trenitalia)/.test(n)) return "train_ticket";
  if (/(foglio|travel[-_ ]?sheet|missione|trasferta)/.test(n)) return "travel_sheet";
  return isFirst ? "travel_sheet" : "other";
}

export type { TravelDocument, TravelDocumentRole, ParsedTravelDocumentsResult };

export async function getExpensesForTrip(tripId: string): Promise<Expense[]> {
  if (DEV_MOCK_TRIPS) {
    ensureSeed();
    await delay(100);
    return read<Expense[]>(LS_EXPENSES, [])
      .filter((e) => e.trip_id === tripId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  const raw = await apiFetch<Expense[]>(`/trips/${encodeURIComponent(tripId)}/expenses`);
  return [...raw].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getCurrentTripExpenses(): Promise<Expense[]> {
  if (DEV_MOCK_TRIPS) {
    ensureSeed();
    await delay(120);
    const t = read<Trip[]>(LS_TRIPS, []).find((x) => x.status === "in_progress");
    if (!t) return [];
    return read<Expense[]>(LS_EXPENSES, [])
      .filter((e) => e.trip_id === t.id)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  const raw = await apiFetch<Expense[]>("/trips/current/expenses");
  return [...raw].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getAllExpenses(): Promise<Expense[]> {
  if (DEV_MOCK_TRIPS) {
    ensureSeed();
    await delay(120);
    return read<Expense[]>(LS_EXPENSES, []).sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  const raw = await apiFetch<Expense[]>(`/expenses`);
  return [...raw].sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ---------- expenses ----------
export interface ExpensePayload {
  category: ExpenseCategory;
  amount: number;
  date: string;
  note?: string;
  paid_by: PaidBy;
  receipt_url?: string;
  source?: "app" | "apple_shortcuts" | "web";
  meal_mode?: MealMode;
  meal_type?: MealType;
}

export async function createExpense(tripId: string, payload: ExpensePayload): Promise<Expense> {
  if (DEV_MOCK_TRIPS) {
    await delay(180);
    const list = read<Expense[]>(LS_EXPENSES, []);
    const newExp: Expense = {
      id: uid(),
      trip_id: tripId,
      sync: "synced",
      source: payload.source ?? "app",
      ...payload,
    };
    write(LS_EXPENSES, [newExp, ...list]);
    return newExp;
  }
  return apiFetch<Expense>(`/trips/${encodeURIComponent(tripId)}/expenses`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Crea una spesa sulla trasferta in corso senza doverla scegliere.
 * Usato dall'integrazione Apple Shortcuts e da flussi rapidi.
 * Endpoint: POST /trips/current/expenses.
 */
export async function createCurrentTripExpense(
  payload: ExpensePayload,
): Promise<Expense> {
  if (DEV_MOCK_TRIPS) {
    const t = read<Trip[]>(LS_TRIPS, []).find((x) => x.status === "in_progress");
    if (!t) throw new Error("Nessuna trasferta in corso");
    return createExpense(t.id, payload);
  }
  return apiFetch<Expense>("/trips/current/expenses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateExpense(expenseId: string, payload: Partial<ExpensePayload>): Promise<Expense> {
  if (DEV_MOCK_TRIPS) {
    await delay(150);
    const list = read<Expense[]>(LS_EXPENSES, []);
    const idx = list.findIndex((e) => e.id === expenseId);
    if (idx < 0) throw new Error("Spesa non trovata");
    list[idx] = { ...list[idx], ...payload };
    write(LS_EXPENSES, list);
    return list[idx];
  }
  return apiFetch<Expense>(`/expenses/${encodeURIComponent(expenseId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteExpense(expenseId: string): Promise<void> {
  if (DEV_MOCK_TRIPS) {
    await delay(120);
    const list = read<Expense[]>(LS_EXPENSES, []).filter((e) => e.id !== expenseId);
    write(LS_EXPENSES, list);
    return;
  }
  await apiFetch<void>(`/expenses/${encodeURIComponent(expenseId)}`, { method: "DELETE" });
}

// ---------- meal budget ----------
export async function getMealBudget(tripId: string): Promise<number> {
  const t = await getTrip(tripId);
  return t?.meal_budget_daily ?? 46.48;
}

export async function updateMealBudget(tripId: string, budget: number): Promise<number> {
  if (DEV_MOCK_TRIPS) {
    await delay(120);
    const trips = read<Trip[]>(LS_TRIPS, []);
    const idx = trips.findIndex((t) => t.id === tripId);
    if (idx < 0) throw new Error("Trasferta non trovata");
    trips[idx] = { ...trips[idx], meal_budget_daily: budget };
    write(LS_TRIPS, trips);
    return budget;
  }
  const res = await apiFetch<{ meal_budget_daily: number }>(
    `/trips/${encodeURIComponent(tripId)}/meal-budget`,
    { method: "PATCH", body: JSON.stringify({ meal_budget_daily: budget }) },
  );
  return res.meal_budget_daily ?? budget;
}

// ---------- pdf ----------
/**
 * Scarica la distinta PDF della trasferta come blob e la salva sul
 * dispositivo. Endpoint: GET /trips/:id/pdf.
 */
export async function downloadTripPdf(tripId: string): Promise<{ filename: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/pdf`, {
      method: "GET",
      headers: { ...authHeaders(), Accept: "application/pdf" },
    });
  } catch {
    throw new ApiError("Servizio non raggiungibile", 0, "network");
  }
  if (!res.ok) throw new ApiError("Impossibile scaricare la distinta", res.status);
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") ?? "";
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
  const filename = decodeURIComponent(m?.[1]?.replace(/"$/, "") ?? `distinta-${tripId}.pdf`);
  if (isBrowser()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }
  return { filename };
}

/** Invia la distinta PDF alla mail dell'utente loggato. POST /trips/:id/pdf {action:"email"} */
export async function emailTripPdf(tripId: string): Promise<{ sent: boolean }> {
  await apiFetch<unknown>(`/trips/${encodeURIComponent(tripId)}/pdf`, {
    method: "POST",
    body: JSON.stringify({ action: "email" }),
  });
  return { sent: true };
}

// ---------- shortcut helper ----------
export interface ShortcutExpensePayload {
  trip_id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  note?: string;
  paid_by: PaidBy;
  source: "apple_shortcuts";
}

export async function ingestShortcutExpense(payload: ShortcutExpensePayload): Promise<Expense> {
  return createExpense(payload.trip_id, {
    category: payload.category,
    amount: payload.amount,
    date: payload.date,
    note: payload.note,
    paid_by: payload.paid_by,
    source: "apple_shortcuts",
  });
}
