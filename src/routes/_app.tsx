import { createFileRoute, Link, Outlet, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Briefcase, Receipt, UtensilsCrossed, User, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { SelectedTripProvider } from "@/lib/selected-trip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  component: AppShell,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-[100dvh] grid place-items-center p-6 text-center">
        <div className="max-w-sm">
          <p className="text-sm text-muted-foreground">Qualcosa è andato storto.</p>
          <p className="mt-2 text-xs text-muted-foreground">{error.message}</p>
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="mt-4 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm"
          >Riprova</button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="min-h-[100dvh] grid place-items-center p-6 text-sm text-muted-foreground">
      Pagina non trovata.
    </div>
  ),
});

const TABS = [
  { to: "/trips", label: "Trasferte", icon: Briefcase },
  { to: "/expenses", label: "Spese", icon: Receipt },
  { to: "/meals", label: "Pasti", icon: UtensilsCrossed },
  { to: "/profile", label: "Profilo", icon: User },
] as const;

function AppShell() {
  const { ready, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login", replace: true });
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-background text-sm text-muted-foreground">
        Caricamento…
      </div>
    );
  }

  const path = location.pathname;
  const hideChrome = path.startsWith("/new-expense");

  return (
    <SelectedTripProvider>
    <div className="min-h-[100dvh] bg-background text-foreground">
      <main className={cn("mx-auto w-full max-w-md", hideChrome ? "" : "pb-32")}>
        <Outlet />
      </main>

      {!hideChrome && (
        <>
          <Link
            to="/new-expense"
            className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 grid place-items-center active:scale-95 transition"
            aria-label="Aggiungi spesa"
          >
            <Plus className="h-6 w-6" />
          </Link>

          <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur">
            <div className="mx-auto max-w-md grid grid-cols-4 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {TABS.map((t) => {
                const active = path === t.to || path.startsWith(t.to + "/");
                const Icon = t.icon;
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[11px] font-medium",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active ? "stroke-[2.4]" : "stroke-[1.8]")} />
                    <span>{t.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </div>
    </SelectedTripProvider>
  );
}