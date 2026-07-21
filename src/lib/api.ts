// Central API client. Currently mocked, but written to mirror the real
// endpoints exposed by the remote backend so the wiring can be swapped
// by only replacing the fetch implementations below.
//
// Real endpoints (future):
//   POST   /api/login
//   GET    /api/trips
//   GET    /api/trips/:id
//   POST   /api/trips/:id/expenses
//   PATCH  /api/expenses/:id
//   DELETE /api/expenses/:id
//   GET    /api/trips/:id/meal-budget
//   PATCH  /api/trips/:id/meal-budget
//   POST   /api/trips/:id/generate-pdf

import type {
  Expense,
  ExpenseCategory,
  PaidBy,
  Trip,
  UserProfile,
} from "./types";

export const API_BASE_URL = "https://rai.marcomammi.com/api";

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

// ---------- seed ----------
function seed() {
  if (!isBrowser()) return;
  if (localStorage.getItem(LS_TRIPS)) return;
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };

  const trips: Trip[] = [
    {
      id: "t1",
      title: "Roma 7",
      destination: "Roma",
      start_date: iso(daysAgo(3)),
      end_date: iso(daysAgo(-2)),
      status: "in_progress",
      advance: 400,
      meal_budget_daily: 46.48,
      has_pdf: false,
    },
    {
      id: "t2",
      title: "Milano 4",
      destination: "Milano",
      start_date: iso(daysAgo(20)),
      end_date: iso(daysAgo(17)),
      status: "closed",
      closed_at: iso(daysAgo(15)),
      advance: 300,
      meal_budget_daily: 46.48,
      has_pdf: true,
    },
    {
      id: "t3",
      title: "Napoli 2",
      destination: "Napoli",
      start_date: iso(daysAgo(40)),
      end_date: iso(daysAgo(38)),
      status: "draft",
      meal_budget_daily: 46.48,
    },
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
  ];

  write(LS_TRIPS, trips);
  write(LS_EXPENSES, expenses);
}

function ensureSeed() {
  seed();
}

const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- auth ----------
export interface LoginResult {
  token: string;
  user: UserProfile;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  await delay();
  if (!email || !password) throw new Error("Email e password obbligatorie");
  if (password.length < 3) throw new Error("Credenziali non valide");
  const user: UserProfile = {
    id: "u1",
    name: "Marco Rossi",
    email,
    matricola: "IT-00421",
    default_meal_budget: 46.48,
  };
  const token = "mock." + uid();
  if (isBrowser()) {
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_USER, JSON.stringify(user));
  }
  ensureSeed();
  return { token, user };
}

export function logout() {
  if (!isBrowser()) return;
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
}

export function getStoredAuth(): { token: string | null; user: UserProfile | null } {
  if (!isBrowser()) return { token: null, user: null };
  const token = localStorage.getItem(LS_TOKEN);
  const raw = localStorage.getItem(LS_USER);
  return {
    token,
    user: raw ? (JSON.parse(raw) as UserProfile) : null,
  };
}

// ---------- trips ----------
export async function getTrips(): Promise<Trip[]> {
  ensureSeed();
  await delay(150);
  const trips = read<Trip[]>(LS_TRIPS, []);
  return [...trips].sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
}

export async function getTrip(id: string): Promise<Trip | null> {
  ensureSeed();
  await delay(120);
  return read<Trip[]>(LS_TRIPS, []).find((t) => t.id === id) ?? null;
}

export async function getExpensesForTrip(tripId: string): Promise<Expense[]> {
  ensureSeed();
  await delay(100);
  return read<Expense[]>(LS_EXPENSES, [])
    .filter((e) => e.trip_id === tripId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getAllExpenses(): Promise<Expense[]> {
  ensureSeed();
  await delay(120);
  return read<Expense[]>(LS_EXPENSES, []).sort((a, b) => (a.date < b.date ? 1 : -1));
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
}

export async function createExpense(tripId: string, payload: ExpensePayload): Promise<Expense> {
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

export async function updateExpense(expenseId: string, payload: Partial<ExpensePayload>): Promise<Expense> {
  await delay(150);
  const list = read<Expense[]>(LS_EXPENSES, []);
  const idx = list.findIndex((e) => e.id === expenseId);
  if (idx < 0) throw new Error("Spesa non trovata");
  list[idx] = { ...list[idx], ...payload };
  write(LS_EXPENSES, list);
  return list[idx];
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await delay(120);
  const list = read<Expense[]>(LS_EXPENSES, []).filter((e) => e.id !== expenseId);
  write(LS_EXPENSES, list);
}

// ---------- meal budget ----------
export async function getMealBudget(tripId: string): Promise<number> {
  const t = await getTrip(tripId);
  return t?.meal_budget_daily ?? 46.48;
}

export async function updateMealBudget(tripId: string, budget: number): Promise<number> {
  await delay(120);
  const trips = read<Trip[]>(LS_TRIPS, []);
  const idx = trips.findIndex((t) => t.id === tripId);
  if (idx < 0) throw new Error("Trasferta non trovata");
  trips[idx] = { ...trips[idx], meal_budget_daily: budget };
  write(LS_TRIPS, trips);
  return budget;
}

// ---------- pdf ----------
export async function generatePdf(tripId: string): Promise<{ url: string }> {
  await delay(500);
  return { url: `${API_BASE_URL}/trips/${tripId}/report.pdf` };
}

// ---------- shortcut helper (payload shape mirrors Apple Shortcuts POST) ----------
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