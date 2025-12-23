import { useState, useEffect } from "react";
import { Reservation } from "../types/game";

const EMAIL_PARSER_URL =
  import.meta.env.VITE_EMAIL_PARSER_URL || "http://localhost:3002";

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${EMAIL_PARSER_URL}/api/reservations`);
      if (!response.ok) {
        throw new Error("Failed to fetch reservations");
      }
      const data = await response.json();
      setReservations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    // Refresh every 2 minutes to catch new emails
    const interval = setInterval(fetchReservations, 120000);
    return () => clearInterval(interval);
  }, []);

  return { reservations, loading, error, refetch: fetchReservations };
}
