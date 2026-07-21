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