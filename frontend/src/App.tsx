import { useEffect, useState } from "react";
import { GameState, Player } from "./types/game";
import { useGameState } from "./hooks/useGameState";
import { useApi } from "./hooks/useApi";
import { PlayerSetup } from "./components/PlayerSetup";
import { CurrentMatchups } from "./components/CurrentMatchups";
import { ScoreEntry } from "./components/ScoreEntry";
import { ScoreHistory } from "./components/ScoreHistory";
import { PlayerStats } from "./components/PlayerStats";
import { PlayerManager } from "./components/PlayerManager";
import { HelpButton } from "./components/HelpModal";

const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === "true";

function App() {
    const {
        session,
        gameState,
        error,
        loading,
        setSession,
        setGameState,
        setError,
        setLoading,
        reset,
        getSavedSessionId,
    } = useGameState();

    const api = useApi();
    const [showHistory, setShowHistory] = useState(false);
    const [tempPlayers, setTempPlayers] = useState<Player[]>([]);

    // Load existing session on mount
    useEffect(() => {
        const loadSession = async () => {
            const savedSessionId = getSavedSessionId();
            if (savedSessionId) {
                try {
                    setLoading(true);
                    const loadedSession = await api.getSession(savedSessionId);
                    setSession(loadedSession);

                    if (
                        loadedSession.currentRound &&
                        !loadedSession.currentRound.completed
                    ) {
                        setGameState(GameState.PLAYING);
                    } else if (loadedSession.players.length >= 4) {
                        setGameState(GameState.SETUP);
                    }
                } catch (err) {
                    console.error("Failed to load session:", err);
                    reset();
                } finally {
                    setLoading(false);
                }
            }
        };

        loadSession();
    }, []);

    // Handle adding player (during setup or mid-game)
    const handleAddPlayer = async (name: string) => {
        try {
            setLoading(true);
            setError(null);

            if (session) {
                // Session exists, add player via API
                const updatedSession = await api.addPlayer(session.id, name);
                setSession(updatedSession);
            } else {
                // No session yet, add to temporary players list
                const newPlayer: Player = {
                    id: `temp-${Date.now()}`,
                    name,
                    gamesPlayed: 0,
                    wins: 0,
                    losses: 0,
                    pointDifferential: 0,
                    roundsSatOut: 0,
                    forceSitOut: false,
                };
                setTempPlayers([...tempPlayers, newPlayer]);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Handle removing player
    const handleRemovePlayer = async (playerId: string) => {
        try {
            setLoading(true);
            setError(null);

            if (session) {
                // Session exists, remove player via API
                const updatedSession = await api.removePlayer(
                    session.id,
                    playerId,
                );
                setSession(updatedSession);
            } else {
                // No session yet, remove from temporary players list
                setTempPlayers(tempPlayers.filter((p) => p.id !== playerId));
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Handle toggling player sit out
    const handleToggleSitOut = async (playerId: string) => {
        if (!session) return;

        try {
            setLoading(true);
            setError(null);
            const updatedSession = await api.togglePlayerSitOut(
                session.id,
                playerId,
            );
            setSession(updatedSession);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Handle updating number of courts
    const handleUpdateNumCourts = async (numCourts: number) => {
        if (!session) return;

        try {
            setLoading(true);
            setError(null);
            const updatedSession = await api.updateNumCourts(
                session.id,
                numCourts,
            );
            setSession(updatedSession);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Start the game (first round)
    const handleStartGame = async (numCourts: number) => {
        try {
            setLoading(true);
            setError(null);

            if (session) {
                // Session already exists, just start next round
                const updatedSession = await api.startNextRound(session.id);
                setSession(updatedSession);
                setGameState(GameState.PLAYING);
            } else {
                // Create new session with temporary players, then start first round
                const playerNames = tempPlayers.map((p) => p.name);
                const newSession = await api.createSession(
                    playerNames,
                    numCourts,
                );
                const updatedSession = await api.startNextRound(newSession.id);
                setSession(updatedSession);
                setTempPlayers([]); // Clear temp players
                setGameState(GameState.PLAYING);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Start next round
    const handleStartNextRound = async () => {
        if (!session) return;

        try {
            setLoading(true);
            setError(null);
            const updatedSession = await api.startNextRound(session.id);
            setSession(updatedSession);
            setGameState(GameState.PLAYING);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Cancel current round
    const handleCancelRound = async () => {
        if (!session) return;

        try {
            setLoading(true);
            setError(null);
            const updatedSession = await api.cancelCurrentRound(session.id);
            setSession(updatedSession);
            setGameState(GameState.PLAYING);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Enter score entry mode
    const handleEnterScores = () => {
        setGameState(GameState.SCORING);
    };

    // Submit scores
    const handleSubmitScores = async (
        scores: { matchId: string; team1Score: number; team2Score: number }[],
    ) => {
        if (!session) return;

        try {
            setLoading(true);
            setError(null);
            const updatedSession = await api.completeRound(session.id, scores);
            setSession(updatedSession);
            setGameState(GameState.PLAYING);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Cancel score entry
    const handleCancelScoreEntry = () => {
        setGameState(GameState.PLAYING);
    };

    // Edit previous scores (from completed round)
    const handleEditPreviousScores = () => {
        // Only allow editing if there's a current round that's completed
        if (!session?.currentRound?.completed) {
            setError(
                "No completed round to edit. Please complete a round first.",
            );
            return;
        }
        setGameState(GameState.SCORING);
    };

    // View history
    const handleViewHistory = () => {
        setShowHistory(true);
    };

    // Close history
    const handleCloseHistory = () => {
        setShowHistory(false);
    };

    // Reset session
    const handleResetSession = async () => {
        if (
            confirm(
                "Are you sure you want to reset the session? All data will be lost.",
            )
        ) {
            try {
                setLoading(true);
                setError(null); // Clear any error messages
                if (session) {
                    await api.deleteSession(session.id);
                }
                reset();
                setTempPlayers([]); // Clear temp players
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        }
    };

    // Show error if there is one
    if (error) {
        return (
            <div className={`min-h-screen bg-red-100 flex items-center justify-center p-4 lg:p-8 ${DEBUG_MODE ? 'border-4 border-red-600' : ''}`}>
                    <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 max-w-2xl w-full">
                        <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-red-600 mb-4 lg:mb-6">
                            Error
                        </h1>
                        <p className="text-lg lg:text-xl xl:text-2xl text-gray-800 mb-6 lg:mb-8">
                            {error}
                        </p>
                        <button
                            onClick={() => setError(null)}
                            className="px-6 lg:px-8 py-3 lg:py-4 bg-blue-500 text-white text-base lg:text-lg xl:text-xl font-bold rounded-xl hover:bg-blue-600"
                        >
                            OK
                        </button>
                    </div>
                </div>
        );
    }

    // Show history view
    if (showHistory && session) {
        return (
            <div className={DEBUG_MODE ? 'border-4 border-red-600' : ''}>
                <ScoreHistory
                    history={session.gameHistory}
                    onClose={handleCloseHistory}
                />
            </div>
        );
    }

    // Setup view
    if (gameState === GameState.SETUP || !session) {
        return (
            <div className={DEBUG_MODE ? 'border-4 border-red-600' : ''}>
                <PlayerSetup
                    players={session?.players || tempPlayers}
                    onAddPlayer={handleAddPlayer}
                    onRemovePlayer={handleRemovePlayer}
                    onStartGame={handleStartGame}
                    onResetSession={handleResetSession}
                    loading={loading}
                />
            </div>
        );
    }

    // Score entry view
    if (gameState === GameState.SCORING && session?.currentRound) {
        return (
            <div className={DEBUG_MODE ? 'border-4 border-red-600' : ''}>
                <ScoreEntry
                    round={session.currentRound}
                    onSubmitScores={handleSubmitScores}
                    onCancel={handleCancelScoreEntry}
                    loading={loading}
                />
            </div>
        );
    }

    // Playing view
    if (gameState === GameState.PLAYING && session) {
        return (
            <div className={`flex ${DEBUG_MODE ? 'border-4 border-red-600' : ''}`}>
                {/* Main Content Area */}
                <div className="flex-1 pr-80 xl:pr-96">
                    {session.currentRound && !session.currentRound.completed ? (
                        <CurrentMatchups
                            round={session.currentRound}
                            onEnterScores={handleEnterScores}
                            onViewHistory={handleViewHistory}
                            onCancelRound={handleCancelRound}
                            onStartNextRound={handleStartNextRound}
                            onResetSession={handleResetSession}
                            loading={loading}
                        />
                    ) : (
                        <PlayerManager
                            players={session.players}
                            numCourts={session.numCourts}
                            sessionId={session.id}
                            onAddPlayer={handleAddPlayer}
                            onRemovePlayer={handleRemovePlayer}
                            onToggleSitOut={handleToggleSitOut}
                            onUpdateNumCourts={handleUpdateNumCourts}
                            onStartNextRound={handleStartNextRound}
                            onViewHistory={handleViewHistory}
                            onEditPreviousScores={handleEditPreviousScores}
                            onResetSession={handleResetSession}
                            hasCompletedRound={
                                !!session.currentRound?.completed
                            }
                            loading={loading}
                        />
                    )}
                </div>

                {/* Right Sidebar */}
                <PlayerStats players={session.players} />
                
                {/* Help Button */}
                <HelpButton />
            </div>
        );
    }

    return null;
}

export default App;
