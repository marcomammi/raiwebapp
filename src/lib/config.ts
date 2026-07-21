// Runtime configuration for the companion app.
// Values here are meant to be swapped when the app is wired to the
// production backend on the corporate site.

// Only email addresses on this domain can be used for future self-registration
// and for admin-created users. Kept intentionally generic in the preview.
export const ALLOWED_EMAIL_DOMAIN = "company.test";

// Self-service registration is disabled until the backend exposes it.
export const SELF_REGISTRATION_ENABLED = false;

export function isAllowedEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return email.slice(at + 1).toLowerCase() === ALLOWED_EMAIL_DOMAIN.toLowerCase();
}