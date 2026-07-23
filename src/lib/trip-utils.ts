import type { Expense, MealEntitlement, MealType, Trip } from "./types";

/**
 * Una spesa concorre al totale se il backend lo dichiara esplicitamente
 * (`counts_in_total === true`) oppure, in assenza del campo, se pagata
 * dal dipendente. Le voci pagate azienda restano visibili in lista ma
 * non entrano in totali/saldi.
 */
export function countsInTotal(e: Expense): boolean {
  if (typeof e.counts_in_total === "boolean") return e.counts_in_total;
  return e.paid_by === "employee";
}

export function sumCountable(expenses: Expense[]): number {
  return expenses.reduce((s, e) => (countsInTotal(e) ? s + e.amount : s), 0);
}

export function getEntitlements(trip: Trip | null | undefined): MealEntitlement[] {
  if (!trip) return [];
  return (
    trip.meal_entitlements ??
    trip.meal_rules_snapshot?.entitlements ??
    []
  );
}

export function findEntitlement(
  trip: Trip | null | undefined,
  date: string,
): MealEntitlement | undefined {
  return getEntitlements(trip).find((x) => x.date === date);
}

export function isMealAllowed(
  trip: Trip | null | undefined,
  date: string,
  type: MealType,
): { allowed: boolean; entitlement?: MealEntitlement; hasRules: boolean } {
  const entitlements = getEntitlements(trip);
  if (!entitlements.length) return { allowed: true, hasRules: false };
  const en = entitlements.find((x) => x.date === date);
  if (!en) return { allowed: false, hasRules: true };
  const allowed = type === "lunch" ? en.lunch_allowed : en.dinner_allowed;
  return { allowed, entitlement: en, hasRules: true };
}

export function entitlementBudget(en: MealEntitlement): number {
  if (typeof en.daily_budget === "number") return en.daily_budget;
  const l = en.lunch_allowed ? en.lunch_budget ?? 0 : 0;
  const d = en.dinner_allowed ? en.dinner_budget ?? 0 : 0;
  return l + d;
}

export function totalMealBudget(trip: Trip | null | undefined): number {
  if (!trip) return 0;
  if (typeof trip.meal_budget_total === "number") return trip.meal_budget_total;
  const ents = getEntitlements(trip);
  if (ents.length) return ents.reduce((s, e) => s + entitlementBudget(e), 0);
  return 0;
}

/**
 * Numero di notti di pernottamento della trasferta.
 * Calcolato come differenza (end - start) in giorni, minimo 1.
 * Se le date non sono valide restituisce 1.
 */
export function tripNights(trip: Trip | null | undefined): number {
  if (!trip?.start_date || !trip?.end_date) return 1;
  const s = new Date(`${trip.start_date.slice(0, 10)}T00:00:00`);
  const e = new Date(`${trip.end_date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  const diff = Math.round((e.getTime() - s.getTime()) / 86_400_000);
  return Math.max(1, diff);
}

export function hotelNightsNote(trip: Trip | null | undefined): string {
  const n = tripNights(trip);
  return n === 1 ? "1 notte" : `${n} notti`;
}