import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";
import { LogOut, Zap, ChevronRight, ShieldCheck } from "lucide-react";
import { eur } from "@/lib/format";
import { useState } from "react";
import { updateMyProfile } from "@/lib/api";
import type { MealProfile } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profilo" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut, isAdmin } = useAuth();
  const nav = useNavigate();
  const [mealProfile, setMealProfile] = useState<MealProfile>(user?.mealProfile ?? "standard");
  const [savingMeal, setSavingMeal] = useState(false);
  if (!user) return null;

  const toggleMeal = async () => {
    const next: MealProfile = mealProfile === "enhanced" ? "standard" : "enhanced";
    setMealProfile(next);
    setSavingMeal(true);
    try {
      await updateMyProfile({ mealProfile: next });
      toast.success(next === "enhanced" ? "Profilo pasti maggiorato attivo" : "Profilo pasti standard attivo");
    } catch (e) {
      setMealProfile(mealProfile);
      toast.error(e instanceof Error ? e.message : "Impossibile aggiornare");
    } finally {
      setSavingMeal(false);
    }
  };

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
          <Row label="Budget pasti predefinito" value={eur(user.default_meal_budget)} />
        </div>

        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Profilo pasti maggiorato</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Se attivo, l'app usa il profilo pasti maggiorato per il calcolo del budget. Altrimenti usa il profilo standard. I valori esatti arrivano dal sito.
              </div>
            </div>
            <button
              onClick={toggleMeal}
              disabled={savingMeal}
              aria-pressed={mealProfile === "enhanced"}
              className={
                "relative h-7 w-12 rounded-full transition shrink-0 " +
                (mealProfile === "enhanced" ? "bg-primary" : "bg-muted") +
                (savingMeal ? " opacity-60" : "")
              }
            >
              <span
                className={
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition " +
                  (mealProfile === "enhanced" ? "left-[22px]" : "left-0.5")
                }
              />
            </button>
          </div>
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