// Runtime configuration for the companion app.
// The backend on the corporate site is the single source of truth.

// Base URL of the real backend API. Override with VITE_API_BASE_URL when
// running against a different environment.
export const API_BASE_URL: string =
  (typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL) ||
  "https://rai.marcomammi.com/api";

// Only email addresses on this domain are accepted for login, admin-created
// users and access requests.
export const ALLOWED_EMAIL_DOMAIN = "company.test";

// Self-service registration is disabled: users request access and an admin
// creates their account.
export const SELF_REGISTRATION_ENABLED = false;

// Development-only fallback for trips/expenses when the backend is not
// reachable in preview. Never applies to authentication.
export const DEV_MOCK_TRIPS = true;

export function isAllowedEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return email.slice(at + 1).toLowerCase() === ALLOWED_EMAIL_DOMAIN.toLowerCase();
}