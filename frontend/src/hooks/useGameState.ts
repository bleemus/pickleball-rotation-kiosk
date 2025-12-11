import { useReducer, useEffect } from "react";
import { Session, GameState } from "../types/game";

interface State {
    session: Session | null;
    gameState: GameState;
    error: string | null;
    loading: boolean;
}

type Action =
    | { type: "SET_SESSION"; payload: Session }
    | { type: "SET_GAME_STATE"; payload: GameState }
    | { type: "SET_ERROR"; payload: string | null }
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "RESET" };

const initialState: State = {
    session: null,
    gameState: GameState.SETUP,
    error: null,
    loading: false,
};

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "SET_SESSION":
            return { ...state, session: action.payload };
        case "SET_GAME_STATE":
            return { ...state, gameState: action.payload };
        case "SET_ERROR":
            return { ...state, error: action.payload, loading: false };
        case "SET_LOADING":
            return { ...state, loading: action.payload };
        case "RESET":
            return initialState;
        default:
            return state;
    }
}

export function useGameState() {
    const [state, dispatch] = useReducer(reducer, initialState);

    // Load session ID from localStorage on mount
    useEffect(() => {
        const savedSessionId = localStorage.getItem("pickleballSessionId");
        if (savedSessionId) {
            // Session ID exists, we'll load it when needed
        }
    }, []);

    const setSession = (session: Session) => {
        dispatch({ type: "SET_SESSION", payload: session });
        localStorage.setItem("pickleballSessionId", session.id);
    };

    const setGameState = (gameState: GameState) => {
        dispatch({ type: "SET_GAME_STATE", payload: gameState });
    };

    const setError = (error: string | null) => {
        dispatch({ type: "SET_ERROR", payload: error });
    };

    const setLoading = (loading: boolean) => {
        dispatch({ type: "SET_LOADING", payload: loading });
    };

    const reset = () => {
        dispatch({ type: "RESET" });
        localStorage.removeItem("pickleballSessionId");
    };

    const getSavedSessionId = (): string | null => {
        return localStorage.getItem("pickleballSessionId");
    };

    return {
        session: state.session,
        gameState: state.gameState,
        error: state.error,
        loading: state.loading,
        setSession,
        setGameState,
        setError,
        setLoading,
        reset,
        getSavedSessionId,
    };
}
