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

// Solo Pranzo e Cena rientrano nel calcolo budget pasti (Colazione esclusa).
export const MEAL_CATEGORIES: ExpenseCategory[] = ["Pranzo", "Cena"];

export type PaidBy = "employee" | "company";
export type SyncStatus = "synced" | "pending" | "error";
export type MealMode = "receipt" | "forfait";
export type MealType = "lunch" | "dinner";
export type MealProfile = "standard" | "enhanced";

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
  meal_mode?: MealMode;
  meal_type?: MealType;
}

export type TripStatus = "draft" | "in_progress" | "closed";

export interface Trip {
  id: string;
  title: string;
  destination?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  status: TripStatus;
  advance?: number; // anticipo
  meal_budget_daily: number;
  closed_at?: string;
  has_pdf?: boolean;
  /** Snapshot delle regole pasti dal backend (valori esatti). */
  meal_rules_snapshot?: MealRulesSnapshot;
}

export interface MealRulesSnapshot {
  profile?: MealProfile;
  lunch_budget?: number;
  dinner_budget?: number;
  daily_budget?: number;
  forfait_amount?: number;
  currency?: string;
}

export interface TrainSegment {
  id?: string;
  date: string;
  from: string;
  to: string;
  departure_time?: string;
  arrival_time?: string;
  train_number?: string;
  amount: number;
  paid_by: PaidBy;
  note?: string;
  attachment_url?: string;
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
  mealProfile: MealProfile;
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
  mealProfile: MealProfile;
  createdAt: string;
}