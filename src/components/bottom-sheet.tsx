import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  className?: string;
  align?: "bottom" | "center-sm";
  children: ReactNode | ((api: { close: () => void }) => ReactNode);
}

/**
 * Bottom sheet con animazioni iOS-like (fade overlay + slide up/down).
 * Rispetta prefers-reduced-motion via styles.css.
 */
export function BottomSheet({ onClose, className, align = "bottom", children }: Props) {
  const [closing, setClosing] = useState(false);
  const closedRef = useRef(false);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setClosing(true);
    window.setTimeout(() => onClose(), 260);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  const alignClass = align === "center-sm" ? "items-end sm:items-center" : "items-end";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/40 flex justify-center",
        alignClass,
        closing ? "sheet-overlay-out" : "sheet-overlay-in",
      )}
      onClick={close}
    >
      <div
        className={cn(
          "w-full max-w-md bg-background",
          closing ? "sheet-panel-out" : "sheet-panel-in",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {typeof children === "function" ? children({ close }) : children}
      </div>
    </div>
  );
}