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
  /** true se il backend ha applicato una maggiorazione pasti per la città. */
  meal_city_adjustment_applied?: boolean;
  /** Etichetta neutra fornita dal backend (es. "Maggiorazione città applicata"). */
  meal_city_adjustment_label?: string;
  lunch_budget?: number;
  dinner_budget?: number;
}

export interface MealRulesSnapshot {
  lunch_budget?: number;
  dinner_budget?: number;
  daily_budget?: number;
  forfait_amount?: number;
  currency?: string;
  city_adjustment_applied?: boolean;
  city_adjustment_label?: string;
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
  document_ref?: string;
}

export type TravelDocumentRole = "travel_sheet" | "train_ticket" | "other";

export type TravelDocumentParseStatus = "idle" | "parsing" | "parsed" | "error";

export interface TravelDocument {
  id: string;
  file: File;
  filename: string;
  role: TravelDocumentRole;
  status: TravelDocumentParseStatus;
  error?: string;
  remote_id?: string;
}

export interface ParsedTripFields {
  travel_sheet_number?: string;
  advance_amount?: number;
  destination?: string;
  city?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export interface ParsedDocumentInfo {
  index?: number;
  filename?: string;
  role?: TravelDocumentRole;
  remote_id?: string;
  status?: TravelDocumentParseStatus;
  error?: string;
}

export interface ParsedTravelDocumentsResult {
  trip_fields?: ParsedTripFields;
  train_segments?: TrainSegment[];
  expenses?: Array<Record<string, unknown>>;
  documents?: ParsedDocumentInfo[];
  raw?: unknown;
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