import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";
import { LogOut, Zap, ChevronRight, ShieldCheck, Coffee } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profilo" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut, isAdmin } = useAuth();
  const nav = useNavigate();
  if (!user) return null;

  return (
    <div>
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Il tuo account</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Profilo</h1>
      </header>

      <div className="px-4 space-y-4">
        <div className="rounded-2xl bg-card border border-border p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center text-lg font-semibold shrink-0">
            {user.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <Row label="Matricola" value={user.matricola} />
        </div>

        <Link
          to="/shortcuts"
          className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3.5 active:bg-accent"
        >
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center">
            <Zap className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Inserimento rapido</div>
            <div className="text-xs text-muted-foreground">Azioni pronte per Comandi Rapidi Apple</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        {isAdmin && (
          <Link
            to="/admin/users"
            className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3.5 active:bg-accent"
          >
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Admin utenti</div>
              <div className="text-xs text-muted-foreground">Gestisci account, ruoli e stati</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}

        <a
          href="https://paypal.me/marcomammi1998"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3.5 active:bg-accent transition"
        >
          <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-700 grid place-items-center">
            <Coffee className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Ti piace l'app? Offrimi un caffè</div>
            <div className="text-xs text-muted-foreground">Una piccola donazione via PayPal</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </a>

        <button
          onClick={() => { signOut(); nav({ to: "/login", replace: true }); }}
          className="w-full h-12 rounded-2xl bg-card border border-border text-red-600 font-medium flex items-center justify-center gap-2 active:bg-accent"
        >
          <LogOut className="h-4 w-4" /> Esci
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}