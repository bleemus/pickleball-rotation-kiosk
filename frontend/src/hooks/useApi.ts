import { Session, Player, Round, GameHistory } from "../types/game";

const API_BASE_URL =
    import.meta.env.VITE_API_URL || "/api";

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

export function useApi() {
    const createSession = async (
        playerNames: string[],
        numCourts?: number,
    ): Promise<Session> => {
        const response = await fetch(`${API_BASE_URL}/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                playerNames,
                numCourts,
            } as CreateSessionRequest),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create session");
        }

        return response.json();
    };

    const updateNumCourts = async (
        sessionId: string,
        numCourts: number,
    ): Promise<Session> => {
        const response = await fetch(
            `${API_BASE_URL}/session/${sessionId}/courts`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numCourts }),
            },
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to update number of courts");
        }

        return response.json();
    };

    const getSession = async (sessionId: string): Promise<Session> => {
        const response = await fetch(`${API_BASE_URL}/session/${sessionId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to get session");
        }

        return response.json();
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

    const addPlayer = async (
        sessionId: string,
        name: string,
    ): Promise<Session> => {
        const response = await fetch(
            `${API_BASE_URL}/session/${sessionId}/players`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name } as AddPlayerRequest),
            },
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to add player");
        }

        return response.json();
    };

    const removePlayer = async (
        sessionId: string,
        playerId: string,
    ): Promise<Session> => {
        const response = await fetch(
            `${API_BASE_URL}/session/${sessionId}/players/${playerId}`,
            { method: "DELETE" },
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to remove player");
        }

        return response.json();
    };

    const getPlayers = async (sessionId: string): Promise<Player[]> => {
        const response = await fetch(
            `${API_BASE_URL}/session/${sessionId}/players`,
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to get players");
        }

        return response.json();
    };

    const togglePlayerSitOut = async (
        sessionId: string,
        playerId: string,
    ): Promise<Session> => {
        const response = await fetch(
            `${API_BASE_URL}/session/${sessionId}/players/${playerId}/sitout`,
            { method: "PATCH" },
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to toggle sit out");
        }

        return response.json();
    };

    const startNextRound = async (sessionId: string): Promise<Session> => {
        const response = await fetch(
            `${API_BASE_URL}/session/${sessionId}/round`,
            {
                method: "POST",
            },
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to start next round");
        }

        return response.json();
    };

    const cancelCurrentRound = async (sessionId: string): Promise<Session> => {
        const response = await fetch(
            `${API_BASE_URL}/session/${sessionId}/round`,
            {
                method: "DELETE",
            },
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to cancel round");
        }

        return response.json();
    };

    const getCurrentRound = async (
        sessionId: string,
    ): Promise<Round | null> => {
        const response = await fetch(
            `${API_BASE_URL}/session/${sessionId}/round/current`,
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to get current round");
        }

        return response.json();
    };

    const completeRound = async (
        sessionId: string,
        scores: CompleteRoundRequest["scores"],
    ): Promise<Session> => {
        const response = await fetch(
            `${API_BASE_URL}/session/${sessionId}/round/complete`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scores } as CompleteRoundRequest),
            },
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to complete round");
        }

        return response.json();
    };

    const getGameHistory = async (
        sessionId: string,
    ): Promise<GameHistory[]> => {
        const response = await fetch(
            `${API_BASE_URL}/session/${sessionId}/history`,
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to get game history");
        }

        return response.json();
    };

    return {
        createSession,
        updateNumCourts,
        getSession,
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
    };
}
