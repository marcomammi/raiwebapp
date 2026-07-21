import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrips } from "./api";
import type { Trip } from "./types";

interface Ctx {
  selectedTripId: string | null;
  setSelectedTripId: (id: string | null) => void;
  selectedTrip: Trip | null;
  trips: Trip[];
  isLoading: boolean;
}

const SelectedTripCtx = createContext<Ctx | null>(null);
const LS_KEY = "app.selectedTripId";

export function SelectedTripProvider({ children }: { children: ReactNode }) {
  const { data: trips = [], isLoading } = useQuery({ queryKey: ["trips"], queryFn: getTrips });
  const [selectedTripId, setSelectedTripIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LS_KEY);
  });

  const setSelectedTripId = useCallback((id: string | null) => {
    setSelectedTripIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(LS_KEY, id);
      else localStorage.removeItem(LS_KEY);
    }
  }, []);

  // Default: in-progress trip, otherwise most recent trip.
  useEffect(() => {
    if (!trips.length) return;
    const stillExists = selectedTripId && trips.some((t) => t.id === selectedTripId);
    if (stillExists) return;
    const inProgress = trips.find((t) => t.status === "in_progress");
    const fallback = inProgress ?? trips[0];
    if (fallback) setSelectedTripId(fallback.id);
  }, [trips, selectedTripId, setSelectedTripId]);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId],
  );

  const value = useMemo(
    () => ({ selectedTripId, setSelectedTripId, selectedTrip, trips, isLoading }),
    [selectedTripId, setSelectedTripId, selectedTrip, trips, isLoading],
  );

  return <SelectedTripCtx.Provider value={value}>{children}</SelectedTripCtx.Provider>;
}

export function useSelectedTrip() {
  const v = useContext(SelectedTripCtx);
  if (!v) throw new Error("useSelectedTrip must be used within SelectedTripProvider");
  return v;
}