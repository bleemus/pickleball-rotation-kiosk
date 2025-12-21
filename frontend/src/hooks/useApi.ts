import { Session, Player, Round, GameHistory } from "../types/game";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

interface CreateSessionRequest {
  playerNames: string[];
  numCourts?: number;
}

interface AddPlayerRequest {
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
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/courts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numCourts }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update number of courts");
    }

    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete session");
    }
  };

  const addPlayer = async (sessionId: string, name: string): Promise<Session> => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name } as AddPlayerRequest),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to add player");
    }

    return response.json();
  };

  const removePlayer = async (sessionId: string, playerId: string): Promise<Session> => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/players/${playerId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to remove player");
    }

    return response.json();
  };

  const getPlayers = async (sessionId: string): Promise<Player[]> => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/players`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get players");
    }

    return response.json();
  };

  const togglePlayerSitOut = async (sessionId: string, playerId: string): Promise<Session> => {
    const response = await fetch(
      `${API_BASE_URL}/session/${sessionId}/players/${playerId}/sitout`,
      { method: "PATCH" }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to toggle sit out");
    }

    return response.json();
  };

  const startNextRound = async (sessionId: string): Promise<Session> => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/round`, {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to start next round");
    }

    return response.json();
  };

  const cancelCurrentRound = async (sessionId: string): Promise<Session> => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/round`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to cancel round");
    }

    return response.json();
  };

  const getCurrentRound = async (sessionId: string): Promise<Round | null> => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/round/current`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get current round");
    }

    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/history`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get game history");
    }

    return response.json();
  };

  const endSession = async (sessionId: string): Promise<Session> => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/end`, {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to end session");
    }

    return response.json();
  };

  return {
    createSession,
    updateNumCourts,
    getSession,
    getActiveSession,
    deleteSession,
    addPlayer,
    removePlayer,
    getPlayers,
    togglePlayerSitOut,
    startNextRound,
    cancelCurrentRound,
    getCurrentRound,
    completeRound,
    getGameHistory,
    endSession,
  };
}
