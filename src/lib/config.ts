// Runtime configuration for the companion app.
// The backend on the corporate site is the single source of truth.

// Base URL used by the frontend. In produzione (browser/PWA) DEVE sempre
// essere il proxy same-origin `/api-proxy`, mai il backend diretto: evita
// CORS/redirect e mantiene il token lato server. Override via
// VITE_API_BASE_URL è ammesso solo in sviluppo o se path relativo ("/...").
const ENV = (typeof import.meta !== "undefined"
  ? (import.meta as { env?: Record<string, string | boolean> }).env
  : undefined) as Record<string, string | boolean> | undefined;
const RAW_OVERRIDE = typeof ENV?.VITE_API_BASE_URL === "string" ? (ENV.VITE_API_BASE_URL as string) : "";
const IS_DEV = ENV?.DEV === true || ENV?.MODE === "development";
const OVERRIDE_ALLOWED = RAW_OVERRIDE && (IS_DEV || RAW_OVERRIDE.startsWith("/"));
const RAW_API_BASE_URL: string = OVERRIDE_ALLOWED ? RAW_OVERRIDE : "/api-proxy";

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