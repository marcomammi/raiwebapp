import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Accedi — Trasferte" },
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
      toast.error(err instanceof Error ? err.message : "Errore di accesso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-md mx-auto w-full">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 h-16 w-16 rounded-3xl bg-primary text-primary-foreground grid place-items-center text-2xl font-semibold shadow-lg">
            T
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Trasferte</h1>
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
              placeholder="nome@azienda.it"
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

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Le credenziali sono verificate sul server centrale.
        </p>
      </div>
    </div>
  );
}