import { useState, useEffect, useRef, useCallback } from "react";
import { Reservation } from "../types/game";

const EMAIL_PARSER_URL = import.meta.env.VITE_EMAIL_PARSER_URL || "http://localhost:3002";

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchReservations = useCallback(async () => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${EMAIL_PARSER_URL}/api/reservations`, {
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch reservations");
      }
      const data = await response.json();
      setReservations(data);
    } catch (err) {
      // Ignore abort errors (expected when component unmounts or new request starts)
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Unknown error");
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
    // Refresh every 2 minutes to catch new emails
    const interval = setInterval(fetchReservations, 120000);

    return () => {
      clearInterval(interval);
      // Abort any in-flight request on cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchReservations]);

  return { reservations, loading, error, refetch: fetchReservations };
}
