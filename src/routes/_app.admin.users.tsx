import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
  type UserPayload,
} from "@/lib/api";
import { ALLOWED_EMAIL_DOMAIN, isAllowedEmail } from "@/lib/config";
import type { AppUser, UserRole, UserStatus } from "@/lib/types";
import type { MealProfile } from "@/lib/types";
import { toast } from "sonner";
import { ChevronLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/users")({
  head: () => ({ meta: [{ title: "Admin utenti" }, { name: "robots", content: "noindex" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { isAdmin, ready, user } = useAuth();
  const nav = useNavigate();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) return;
    if (!isAdmin) {
      toast.error("Accesso negato: area riservata agli amministratori.");
      nav({ to: "/trips", replace: true });
    }
  }, [ready, user, isAdmin, nav]);

  const reload = async () => {
    const list = await getUsers();
    setUsers(list);
  };

  useEffect(() => {
    if (isAdmin) void reload();
  }, [isAdmin]);

  const activeAdmins = useMemo(
    () => (users ?? []).filter((u) => u.role === "admin" && u.status === "active").length,
    [users],
  );

  if (!isAdmin) return null;

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (u: AppUser) => { setEditing(u); setShowForm(true); };

  const handleDelete = async (u: AppUser) => {
    if (!confirm(`Cancellare ${u.email}?`)) return;
    try {
      await deleteUser(u.id);
      toast.success("Utente eliminato");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  };

  return (
    <div>
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3 flex items-center gap-2">
        <Link
          to="/profile"
          className="h-9 w-9 rounded-full grid place-items-center text-muted-foreground active:bg-accent"
          aria-label="Indietro"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Solo admin</p>
          <h1 className="text-2xl font-semibold tracking-tight">Utenti</h1>
        </div>
        <button
          onClick={openCreate}
          className="h-10 px-3 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1 active:scale-95"
        >
          <Plus className="h-4 w-4" /> Nuovo
        </button>
      </header>

      <div className="px-4 pb-6 space-y-2">
        {users === null && <div className="text-sm text-muted-foreground px-2 py-6">Caricamento…</div>}
        {users?.length === 0 && <div className="text-sm text-muted-foreground px-2 py-6">Nessun utente.</div>}
        {users?.map((u) => (
          <div key={u.id} className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-semibold shrink-0">
                {(u.firstName[0] ?? "") + (u.lastName[0] ?? "")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{u.firstName} {u.lastName}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone={u.role === "admin" ? "primary" : "muted"}>{u.role}</Badge>
                  <Badge tone={u.status === "active" ? "success" : "danger"}>{u.status}</Badge>
                  <Badge tone="muted">#{u.employeeNumber}</Badge>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => openEdit(u)}
                  className="h-9 w-9 rounded-full grid place-items-center text-muted-foreground active:bg-accent"
                  aria-label="Modifica"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  className="h-9 w-9 rounded-full grid place-items-center text-red-600 active:bg-accent"
                  aria-label="Elimina"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {activeAdmins <= 1 && (
          <p className="px-2 pt-2 text-[11px] text-muted-foreground">
            Attenzione: c'è un solo admin attivo. Non è possibile cancellarlo o disattivarlo.
          </p>
        )}
      </div>

      {showForm && (
        <UserFormModal
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={async () => { setShowForm(false); await reload(); }}
        />
      )}
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "primary" | "success" | "danger" | "muted" }) {
  const cls =
    tone === "primary" ? "bg-primary/10 text-primary" :
    tone === "success" ? "bg-emerald-500/10 text-emerald-600" :
    tone === "danger" ? "bg-red-500/10 text-red-600" :
    "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{children}</span>;
}

function UserFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: AppUser | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [employeeNumber, setEmployeeNumber] = useState(initial?.employeeNumber ?? "");
  const [role, setRole] = useState<UserRole>(initial?.role ?? "user");
  const [status, setStatus] = useState<UserStatus>(initial?.status ?? "active");
  const [mealProfile, setMealProfile] = useState<MealProfile>(initial?.mealProfile ?? "standard");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedEmail(email.trim())) {
      toast.error(`Email non ammessa. Usa @${ALLOWED_EMAIL_DOMAIN}.`);
      return;
    }
    const payload: UserPayload = {
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      employeeNumber: employeeNumber.trim(),
      role,
      status,
      mealProfile,
    };
    setSaving(true);
    try {
      if (initial) await updateUser(initial.id, payload);
      else await createUser(payload);
      toast.success(initial ? "Utente aggiornato" : "Utente creato");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md bg-background rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{initial ? "Modifica utente" : "Nuovo utente"}</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-full grid place-items-center text-muted-foreground active:bg-accent" aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`nome@${ALLOWED_EMAIL_DOMAIN}`}
              className="w-full h-11 rounded-xl border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome">
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full h-11 rounded-xl border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </Field>
            <Field label="Cognome">
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full h-11 rounded-xl border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </Field>
          </div>
          <Field label="Matricola">
            <input required value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} className="w-full h-11 rounded-xl border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ruolo">
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full h-11 rounded-xl border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </Field>
            <Field label="Stato">
              <select value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} className="w-full h-11 rounded-xl border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </Field>
          </div>

          <Field label="Profilo pasti">
            <div className="grid grid-cols-2 rounded-xl bg-muted p-1 h-11 text-xs">
              {(["standard", "enhanced"] as MealProfile[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setMealProfile(p)}
                  className={
                    "rounded-lg font-medium " +
                    (mealProfile === p ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")
                  }
                >
                  {p === "standard" ? "Standard" : "Maggiorato"}
                </button>
              ))}
            </div>
          </Field>

          <button type="submit" disabled={saving} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-60 mt-2">
            {saving ? "Salvataggio…" : initial ? "Salva modifiche" : "Crea utente"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
