// Runtime configuration for the companion app.
// The backend on the corporate site is the single source of truth.

// Base URL of the real backend API. Override with VITE_API_BASE_URL when
// running against a different environment.
const RAW_API_BASE_URL: string =
  (typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL) ||
  "https://rai.marcomammi.com/api";

// Normalizza rimuovendo eventuali slash finali: gli endpoint iniziano sempre con "/".
export const API_BASE_URL: string = RAW_API_BASE_URL.replace(/\/+$/, "");

// Only email addresses on this domain are accepted for login, admin-created
// users and access requests.
export const ALLOWED_EMAIL_DOMAIN = "rai.it";

// Self-service registration is disabled: users request access and an admin
// creates their account.
export const SELF_REGISTRATION_ENABLED = false;

// Development-only fallback for trips/expenses when the backend is not
// reachable locally. Disabled by default: enable explicitly in dev via
// `VITE_DEV_MOCK_TRIPS=true`. Never applies to authentication and never
// activates in preview/production unless the flag is set.
export const DEV_MOCK_TRIPS: boolean =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: Record<string, string> }).env?.VITE_DEV_MOCK_TRIPS === "true") ||
  false;

export function isAllowedEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return email.slice(at + 1).toLowerCase() === ALLOWED_EMAIL_DOMAIN.toLowerCase();
}