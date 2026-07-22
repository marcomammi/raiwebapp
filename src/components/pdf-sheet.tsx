import { useState } from "react";
import { Download, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { downloadTripPdf, emailTripPdf } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BottomSheet } from "@/components/bottom-sheet";

interface Props {
  tripId: string;
  hasKmData?: boolean;
  onClose: () => void;
}

export function PdfSheet({ tripId, hasKmData, onClose }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState<null | "download" | "email">(null);

  const download = async (close: () => void) => {
    setBusy("download");
    try {
      const res = await downloadTripPdf(tripId);
      toast.success(`Distinta scaricata${res.filename ? `: ${res.filename}` : ""}`);
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore download PDF");
    } finally {
      setBusy(null);
    }
  };

  const send = async (close: () => void) => {
    setBusy("email");
    try {
      await emailTripPdf(tripId);
      toast.success(user?.email ? `Inviata\u00a0a ${user.email}` : "Email inviata");
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore invio email");
    } finally {
      setBusy(null);
    }
  };

  return (
    <BottomSheet
      onClose={onClose}
      className="rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      {({ close }) => (
        <>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Distinta trasferta</h2>
          <button onClick={close} className="h-9 w-9 rounded-full grid place-items-center text-muted-foreground active:bg-accent" aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Verrà generata la <span className="font-medium text-foreground">distinta</span>
          {hasKmData && <> insieme alla <span className="font-medium text-foreground">scheda km</span></>}.
        </p>
        <div className="mt-4 space-y-2">
          <button
            onClick={() => download(close)}
            disabled={busy !== null}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Download className="h-4 w-4" /> {busy === "download" ? "Preparazione…" : "Scarica PDF"}
          </button>
          <button
            onClick={() => send(close)}
            disabled={busy !== null || !user?.email}
            className="w-full h-12 rounded-xl bg-card border border-border font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Mail className="h-4 w-4" /> {busy === "email" ? "Invio…" : "Invia alla mia email"}
          </button>
          {user?.email && (
            <p className="text-[11px] text-muted-foreground text-center">Verrà inviata a {user.email}</p>
          )}
        </div>
        </>
      )}
    </BottomSheet>
  );
}