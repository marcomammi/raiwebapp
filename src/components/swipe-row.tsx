import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SwipeAction {
  label: string;
  onClick: () => void;
  tone?: "danger" | "primary";
}

interface Props {
  children: React.ReactNode;
  action: SwipeAction;
  /** Larghezza dell'azione rivelata (px). */
  actionWidth?: number;
  className?: string;
  /** Colore di sfondo della riga (default bg-card). */
  rowClassName?: string;
}

/**
 * Riga swipeable: trascinamento orizzontale verso sinistra per rivelare
 * un'azione. Il tap normale rimane attivo se non c'è stato drag.
 */
export function SwipeRow({
  children,
  action,
  actionWidth = 92,
  className,
  rowClassName,
}: Props) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startOffset = useRef(0);
  const axis = useRef<"h" | "v" | null>(null);
  const moved = useRef(false);

  const reset = () => setOffset(0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startOffset.current = offset;
    axis.current = null;
    moved.current = false;
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (axis.current == null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (axis.current !== "h") return;
    moved.current = true;
    let next = startOffset.current + dx;
    const min = -actionWidth - 24;
    if (next > 0) next = Math.min(next * 0.3, 12);
    if (next < min) next = min;
    setOffset(next);
  };
  const onPointerUp = () => {
    setDragging(false);
    startX.current = null;
    startY.current = null;
    if (offset < -actionWidth / 2) setOffset(-actionWidth);
    else setOffset(0);
    axis.current = null;
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
      return;
    }
    if (offset !== 0) {
      e.preventDefault();
      e.stopPropagation();
      reset();
    }
  };

  const bg = action.tone === "primary" ? "bg-primary" : "bg-red-600";

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => {
          action.onClick();
          reset();
        }}
        style={{ width: actionWidth }}
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-center text-white text-sm font-semibold active:scale-[0.97] transition",
          bg,
        )}
        aria-label={action.label}
      >
        {action.label}
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
          touchAction: "pan-y",
        }}
        className={cn("relative", rowClassName ?? "bg-card")}
      >
        {children}
      </div>
    </div>
  );
}