export type ExpenseCategory =
  | "Pranzo"
  | "Cena"
  | "Colazione"
  | "Hotel"
  | "City tax"
  | "Taxi"
  | "Treno"
  | "Aereo"
  | "Mezzi pubblici"
  | "Carburante"
  | "Altro";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Pranzo",
  "Cena",
  "Colazione",
  "Hotel",
  "City tax",
  "Taxi",
  "Treno",
  "Aereo",
  "Mezzi pubblici",
  "Carburante",
  "Altro",
];

export const MEAL_CATEGORIES: ExpenseCategory[] = ["Pranzo", "Cena", "Colazione"];

export type PaidBy = "employee" | "company";
export type SyncStatus = "synced" | "pending" | "error";

export interface Expense {
  id: string;
  trip_id: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
  paid_by: PaidBy;
  receipt_url?: string;
  source?: "app" | "apple_shortcuts" | "web";
  sync?: SyncStatus;
}

export type TripStatus = "draft" | "in_progress" | "closed";

export interface Trip {
  id: string;
  title: string;
  destination?: string;
  start_date: string;
  end_date: string;
  status: TripStatus;
  advance?: number; // anticipo
  meal_budget_daily: number;
  closed_at?: string;
  has_pdf?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  role: UserRole;
  status: UserStatus;
  default_meal_budget: number;
  createdAt: string;
  /** Derived: `${firstName} ${lastName}`. */
  name: string;
  /** Alias of employeeNumber for legacy UI. */
  matricola: string;
}

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "disabled";

export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}