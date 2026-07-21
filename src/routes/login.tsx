import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { requestAccess, ApiError } from "@/lib/api";
import { ALLOWED_EMAIL_DOMAIN, isAllowedEmail } from "@/lib/config";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Accedi — Gestione trasferte" },
      { name: "description", content: "Accedi per gestire le tue trasferte e spese." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, ready } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: "/trips", replace: true });
  }, [ready, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate({ to: "/trips", replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "network" || err.status === 0) {
          toast.error("Servizio non raggiungibile tramite proxy. Riprova tra poco.");
        } else if (err.status === 401) {
          toast.error("Credenziali non valide.");
        } else if (err.status === 403) {
          toast.error("Accesso negato.");
        } else {
          toast.error(err.message || "Errore del server. Riprova più tardi.");
        }
      } else {
        toast.error(err instanceof Error ? err.message : "Errore di accesso");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    const em = email.trim();
    if (!em) {
      toast.error("Inserisci l'email aziendale prima di richiedere l'accesso.");
      return;
    }
    if (!isAllowedEmail(em)) {
      toast.error(`Usa un indirizzo @${ALLOWED_EMAIL_DOMAIN}.`);
      return;
    }
    try {
      await requestAccess({ email: em });
      toast.success("Richiesta inviata. Un amministratore ti contatterà.");
    } catch (err) {
      toast.message(err instanceof Error ? err.message : "Richiesta non disponibile.");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-md mx-auto w-full">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 h-16 w-16 rounded-3xl bg-primary text-primary-foreground grid place-items-center text-2xl font-semibold shadow-lg">
            T
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestione trasferte</h1>
          <p className="mt-1 text-sm text-muted-foreground">Accedi per continuare</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 rounded-xl border border-input bg-card px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={`nome@${ALLOWED_EMAIL_DOMAIN}`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 rounded-xl border border-input bg-card px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium text-base shadow-sm transition active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? "Accesso…" : "Accedi"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleRequestAccess}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Richiedi accesso
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Connessione tramite proxy webapp
        </p>
      </div>
    </div>
  );
}
