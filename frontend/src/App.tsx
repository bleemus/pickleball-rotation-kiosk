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
import { SessionSummary } from "./components/SessionSummary";

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

      try {
        setLoading(true);
        let loadedSession = null;

        // First, try to load from saved session ID
        if (savedSessionId) {
          try {
            loadedSession = await api.getSession(savedSessionId);
          } catch (err) {
            console.error("Failed to load saved session:", err);
            // Session ID in localStorage is invalid, clear it
            reset();
          }
        }

        // If no saved session or it failed to load, check for active session
        if (!loadedSession) {
          try {
            loadedSession = await api.getActiveSession();
          } catch (err) {
            // No active session exists, that's okay
            console.log("No active session found");
          }
        }

        // If we found a session (either saved or active), set it
        if (loadedSession) {
          setSession(loadedSession);

          // If session has game history or a completed round, it's an active session
          if (loadedSession.gameHistory.length > 0 || loadedSession.currentRound) {
            setGameState(GameState.PLAYING);
          } else if (loadedSession.players.length >= 4) {
            // Session exists with players but no rounds started yet
            setGameState(GameState.SETUP);
          }
        }
      } catch (err) {
        console.error("Failed to load session:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // Poll for active sessions when no session is loaded
  // This allows new browsers to detect sessions started in other browsers
  useEffect(() => {
    if (session) {
      // Already have a session, no need to poll for new sessions
      if (DEBUG_MODE) {
        console.log("[Poll] Session already loaded, skipping poll for new sessions");
      }
      return;
    }

    if (DEBUG_MODE) {
      console.log("[Poll] Starting to poll for active sessions (no session loaded)");
    }

    const pollForActiveSession = async () => {
      try {
        if (DEBUG_MODE) {
          console.log("[Poll] Checking for active session...");
        }
        const activeSession = await api.getActiveSession();
        if (activeSession) {
          if (DEBUG_MODE) {
            console.log("[Poll] Found active session:", activeSession.id);
          }
          setSession(activeSession);

          // Determine game state based on session data
          if (activeSession.gameHistory.length > 0 || activeSession.currentRound) {
            setGameState(GameState.PLAYING);
          } else if (activeSession.players.length >= 4) {
            setGameState(GameState.SETUP);
          }
        } else {
          if (DEBUG_MODE) {
            console.log("[Poll] No active session found (returned null)");
          }
        }
      } catch (err) {
        // No active session exists, that's okay
        if (DEBUG_MODE) {
          console.log("[Poll] No active session found (error):", err);
        }
      }
    };

    // Poll every 2 seconds
    const intervalId = setInterval(pollForActiveSession, 2000);

    // Cleanup interval on unmount or when session is loaded
    return () => {
      if (DEBUG_MODE) {
        console.log("[Poll] Stopping poll for active sessions");
      }
      clearInterval(intervalId);
    };
  }, [session]);

  // Poll for session updates when a session is loaded
  // This keeps the session synchronized across multiple browsers
  useEffect(() => {
    if (!session) {
      // No session loaded, nothing to refresh
      return;
    }

    const refreshSession = async () => {
      try {
        const updatedSession = await api.getSession(session.id);

        // Only force state changes when round completion status changes
        // If someone just completed the round, kick everyone back to PLAYING
        const shouldResetToPlaying =
          updatedSession.currentRound?.completed && gameState === GameState.SCORING;

        // Always update session data so all clients see the latest
        setSession(updatedSession);

        if (shouldResetToPlaying) {
          setGameState(GameState.PLAYING);
        }
        // Otherwise, let users stay on whatever screen they're on
      } catch (err) {
        if (DEBUG_MODE) {
          console.log("[Poll] Session no longer exists (likely deleted), clearing local state");
        }
        // Session was deleted in another browser, clear it locally
        reset();
        setError(null); // Clear any error messages
      }
    };

    // Poll every 2 seconds
    const intervalId = setInterval(refreshSession, 2000);

    // Cleanup interval on unmount or when session changes
    return () => clearInterval(intervalId);
  }, [session?.id]); // Remove gameState from dependencies to avoid re-runs

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
          id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          pointDifferential: 0,
          roundsSatOut: 0,
          consecutiveRoundsSatOut: 0,
          forceSitOut: false,
        };
        // Use functional update to avoid race conditions when adding multiple players
        setTempPlayers((prevPlayers) => [...prevPlayers, newPlayer]);
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
        const updatedSession = await api.removePlayer(session.id, playerId);
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
      const updatedSession = await api.togglePlayerSitOut(session.id, playerId);
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
      const updatedSession = await api.updateNumCourts(session.id, numCourts);
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
        const newSession = await api.createSession(playerNames, numCourts);
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
    scores: { matchId: string; team1Score: number; team2Score: number }[]
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
      setError("No completed round to edit. Please complete a round first.");
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
    if (confirm("Are you sure you want to reset the session? All data will be lost.")) {
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

  // End session
  const handleEndSession = async () => {
    if (!session) return;

    if (confirm("Are you sure you want to end the session? You'll see the final rankings.")) {
      try {
        setLoading(true);
        setError(null);
        const updatedSession = await api.endSession(session.id);
        setSession(updatedSession);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Show loading screen during initial session check
  if (loading && !session && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // Show session summary if session has ended
  if (session?.ended) {
    return (
      <div className={DEBUG_MODE ? "border-4 border-red-600" : ""}>
        <SessionSummary
          players={session.players}
          onResetSession={handleResetSession}
          loading={loading}
        />
      </div>
    );
  }

  // Show error if there is one
  if (error) {
    return (
      <div
        className={`min-h-screen bg-red-100 flex items-center justify-center p-4 lg:p-8 ${DEBUG_MODE ? "border-4 border-red-600" : ""}`}
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 max-w-2xl w-full">
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-red-600 mb-4 lg:mb-6">
            Error
          </h1>
          <p className="text-lg lg:text-xl xl:text-2xl text-gray-800 mb-6 lg:mb-8">{error}</p>
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
      <div className={DEBUG_MODE ? "border-4 border-red-600" : ""}>
        <ScoreHistory history={session.gameHistory} onClose={handleCloseHistory} />
      </div>
    );
  }

  // Setup view
  if (gameState === GameState.SETUP || !session) {
    return (
      <div className={DEBUG_MODE ? "border-4 border-red-600" : ""}>
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
      <div className={DEBUG_MODE ? "border-4 border-red-600" : ""}>
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
      <div className={`flex flex-col lg:flex-row ${DEBUG_MODE ? "border-4 border-red-600" : ""}`}>
        {/* Main Content Area */}
        <div className="flex-1 lg:pr-80 xl:pr-96 flex flex-col">
          <div className="flex-1">
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
                onEndSession={handleEndSession}
                hasCompletedRound={!!session.currentRound?.completed}
                loading={loading}
              />
            )}
          </div>

          {/* Bottom Buttons - Desktop only: Help button */}
          <div className="hidden lg:block p-2 lg:p-8">
            <HelpButton />
          </div>
        </div>

        {/* Player Stats - Right Sidebar on Desktop, Flows below on Mobile */}
        <div className="lg:hidden">
          <PlayerStats players={session.players} />
          {/* Mobile: Reset + Help buttons below stats */}
          <div className="p-4 flex gap-2">
            <button
              onClick={handleResetSession}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              Reset
            </button>
            <div className="flex-1">
              <HelpButton />
            </div>
          </div>
        </div>
        <div className="hidden lg:block">
          <PlayerStats players={session.players} />
        </div>
      </div>
    );
  }

  return null;
}

export default App;
