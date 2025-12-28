import { Session, Player, Round, GameHistory } from "../types/game";
import { Reservation } from "../types/reservation";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

interface CreateSessionRequest {
  playerNames: string[];
  numCourts?: number;
}

interface AddPlayerRequest {
  name: string;
}

interface RenamePlayerRequest {
  name: string;
}

interface CompleteRoundRequest {
  scores: {
    matchId: string;
    team1Score: number;
    team2Score: number;
  }[];
}

/**
 * Handles API response errors with proper fallbacks for network issues
 */
async function handleApiError(response: Response, defaultMessage: string): Promise<never> {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const error = await response.json();
      throw new Error(error.error || defaultMessage);
    } else {
      // Non-JSON response (HTML error page, etc.)
      throw new Error(`${defaultMessage} (HTTP ${response.status})`);
    }
  } catch (parseError) {
    // If it's already an Error we threw, re-throw it
    if (parseError instanceof Error) {
      throw parseError;
    }
    // Otherwise it's a parsing error, wrap it
    throw new Error(`${defaultMessage} (Parse error)`);
  }
}

export function useApi() {
  const createSession = async (playerNames: string[], numCourts?: number): Promise<Session> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerNames,
          numCourts,
        } as CreateSessionRequest),
      });

      if (!response.ok) {
        await handleApiError(response, "Failed to create session");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to create session (Network error)");
    }
  };

  const updateNumCourts = async (sessionId: string, numCourts: number): Promise<Session> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}/courts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numCourts }),
      });

      if (!response.ok) {
        await handleApiError(response, "Failed to update number of courts");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to update number of courts (Network error)");
    }
  };

  const getSession = async (sessionId: string): Promise<Session> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}`);

      if (!response.ok) {
        await handleApiError(response, "Failed to get session");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to get session (Network error)");
    }
  };

  const getActiveSession = async (): Promise<Session | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/active`);

      if (!response.ok) {
        if (response.status === 404) {
          // No active session exists, return null
          return null;
        }
        await handleApiError(response, "Failed to get active session");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to get active session (Network error)");
    }
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        await handleApiError(response, "Failed to delete session");
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to delete session (Network error)");
    }
  };

  const addPlayer = async (sessionId: string, name: string): Promise<Session> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name } as AddPlayerRequest),
      });

      if (!response.ok) {
        await handleApiError(response, "Failed to add player");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to add player (Network error)");
    }
  };

  const removePlayer = async (sessionId: string, playerId: string): Promise<Session> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}/players/${playerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        await handleApiError(response, "Failed to remove player");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to remove player (Network error)");
    }
  };

  const renamePlayer = async (
    sessionId: string,
    playerId: string,
    name: string
  ): Promise<Session> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/session/${sessionId}/players/${playerId}/rename`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name } as RenamePlayerRequest),
        }
      );

      if (!response.ok) {
        await handleApiError(response, "Failed to rename player");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to rename player (Network error)");
    }
  };

  const getPlayers = async (sessionId: string): Promise<Player[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}/players`);

      if (!response.ok) {
        await handleApiError(response, "Failed to get players");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to get players (Network error)");
    }
  };

  const togglePlayerSitOut = async (sessionId: string, playerId: string): Promise<Session> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/session/${sessionId}/players/${playerId}/sitout`,
        { method: "PATCH" }
      );

      if (!response.ok) {
        await handleApiError(response, "Failed to toggle sit out");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to toggle sit out (Network error)");
    }
  };

  const startNextRound = async (sessionId: string): Promise<Session> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}/round`, {
        method: "POST",
      });

      if (!response.ok) {
        await handleApiError(response, "Failed to start next round");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to start next round (Network error)");
    }
  };

  const cancelCurrentRound = async (sessionId: string): Promise<Session> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}/round`, {
        method: "DELETE",
      });

      if (!response.ok) {
        await handleApiError(response, "Failed to cancel round");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to cancel round (Network error)");
    }
  };

  const getCurrentRound = async (sessionId: string): Promise<Round | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}/round/current`);

      if (!response.ok) {
        await handleApiError(response, "Failed to get current round");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to get current round (Network error)");
    }
  };

  const completeRound = async (
    sessionId: string,
    scores: CompleteRoundRequest["scores"]
  ): Promise<Session> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}/round/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores } as CompleteRoundRequest),
      });

      if (!response.ok) {
        await handleApiError(response, "Failed to complete round");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to complete round (Network error)");
    }
  };

  const getGameHistory = async (sessionId: string): Promise<GameHistory[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}/history`);

      if (!response.ok) {
        await handleApiError(response, "Failed to get game history");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to get game history (Network error)");
    }
  };

  const endSession = async (sessionId: string): Promise<Session> => {
    try {
      const response = await fetch(`${API_BASE_URL}/session/${sessionId}/end`, {
        method: "POST",
      });

      if (!response.ok) {
        await handleApiError(response, "Failed to end session");
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to end session (Network error)");
    }
  };

  const getCurrentReservations = async (): Promise<{
    reservations: Reservation[];
    serviceAvailable: boolean;
  }> => {
    try {
      // First check if email service is enabled
      const healthResponse = await fetch(`${API_BASE_URL}/reservations/health`);
      const health = await healthResponse.json();

      // If email service is not enabled, return empty with serviceAvailable: false
      if (!health.emailEnabled) {
        return { reservations: [], serviceAvailable: false };
      }

      // Email service is enabled, fetch current reservations
      const response = await fetch(`${API_BASE_URL}/reservations/current`);

      if (!response.ok) {
        // If email parser service is down, return empty array with serviceAvailable: false
        if (response.status === 503) {
          console.warn("Reservation service unavailable");
          return { reservations: [], serviceAvailable: false };
        }
        await handleApiError(response, "Failed to get current reservations");
      }

      const reservations = await response.json();
      return { reservations, serviceAvailable: true };
    } catch (error) {
      console.error("Error fetching reservations:", error);
      // Return empty array on network errors to avoid breaking the UI
      return { reservations: [], serviceAvailable: false };
    }
  };

  return {
    createSession,
    updateNumCourts,
    getSession,
    getActiveSession,
    deleteSession,
    addPlayer,
    removePlayer,
    renamePlayer,
    getPlayers,
    togglePlayerSitOut,
    startNextRound,
    cancelCurrentRound,
    getCurrentRound,
    completeRound,
    getGameHistory,
    endSession,
    getCurrentReservations,
  };
}
