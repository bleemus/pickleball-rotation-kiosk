import { useState } from "react";
import { Player } from "../types/game";

interface PlayerManagerProps {
  players: Player[];
  numCourts: number;
  sessionId?: string;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onToggleSitOut: (playerId: string) => void;
  onUpdateNumCourts: (numCourts: number) => void;
  onStartNextRound: () => void;
  onViewHistory: () => void;
  onEditPreviousScores: () => void;
  onResetSession: () => void;
  onEndSession: () => void;
  hasCompletedRound: boolean;
  loading: boolean;
}

export function PlayerManager({
  players,
  numCourts,
  onAddPlayer,
  onRemovePlayer,
  onToggleSitOut,
  onUpdateNumCourts,
  onStartNextRound,
  onViewHistory,
  onEditPreviousScores,
  onResetSession,
  onEndSession,
  hasCompletedRound,
  loading,
}: PlayerManagerProps) {
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showCourtSelector, setShowCourtSelector] = useState(false);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerName.trim()) {
      setError("Please enter a player name");
      return;
    }

    if (playerName.trim().length > 30) {
      setError("Player name must be 30 characters or less");
      return;
    }

    if (players.some((p) => p.name.toLowerCase() === playerName.toLowerCase())) {
      setError("Player name already exists");
      return;
    }

    onAddPlayer(playerName.trim());
    setPlayerName("");
    setError(null);
  };

  const handleRemovePlayer = (playerId: string, playerName: string) => {
    if (confirm(`Are you sure you want to remove ${playerName} from the session?`)) {
      onRemovePlayer(playerId);
    }
  };

  return (
    <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-3 lg:p-6 lg:h-screen lg:flex lg:items-center lg:justify-center lg:overflow-hidden">
      {/* Reset Button - Upper Left (Desktop only, Mobile at bottom via App.tsx) */}
      <button
        onClick={onResetSession}
        disabled={loading}
        className="hidden lg:block fixed top-4 left-4 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 shadow-lg z-10"
      >
        Reset
      </button>

      {/* Change Courts Button - Lower Left (Desktop only) */}
      <button
        onClick={() => setShowCourtSelector(!showCourtSelector)}
        disabled={loading}
        className="hidden lg:block fixed bottom-4 left-4 px-4 py-2 bg-indigo-500 text-white text-sm font-bold rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 shadow-lg z-10"
      >
        {showCourtSelector ? "Hide Courts" : "Change Courts"}
      </button>

      {/* Number of Courts Selector - Popup */}
      {showCourtSelector && (
        <div className="fixed bottom-16 left-4 bg-white rounded-xl shadow-2xl p-4 z-10 border-2 border-indigo-500">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Number of Courts</h3>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              value={numCourts}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= 1) {
                  onUpdateNumCourts(value);
                }
              }}
              className="w-20 px-3 py-2 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-center font-bold"
              disabled={loading}
            />
            <span className="text-gray-600 text-sm">
              {numCourts === 1 ? "court" : "courts"}
              <br />
              (requires {numCourts * 4})
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl p-6 lg:p-10 max-w-5xl w-full lg:max-h-full lg:overflow-y-auto">
        <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-800 mb-4 lg:mb-6 text-center">
          Manage Players
        </h1>

        {/* Start Next Round Button - Prominent at Top */}
        <div className="mb-6 lg:mb-8 space-y-3">
          <button
            onClick={onStartNextRound}
            disabled={loading || players.filter((p) => !p.forceSitOut).length < numCourts * 4}
            className="w-full px-8 py-5 lg:py-6 bg-green-500 text-white text-2xl lg:text-3xl xl:text-4xl font-bold rounded-2xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
          >
            {loading ? "Starting..." : "Start Next Round"}
          </button>
          {players.filter((p) => !p.forceSitOut).length < numCourts * 4 && (
            <p className="text-center text-red-600 mt-2 text-sm lg:text-base font-semibold">
              Need at least {numCourts * 4} active players (
              {players.filter((p) => !p.forceSitOut).length} currently active)
            </p>
          )}

          {/* End Session Button */}
          <button
            onClick={onEndSession}
            disabled={loading}
            className="w-full px-8 py-4 lg:py-5 bg-purple-500 text-white text-xl lg:text-2xl xl:text-3xl font-bold rounded-2xl hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
          >
            End Session & View Final Rankings
          </button>
        </div>

        {/* Add Player Form */}
        <div className="mb-6 lg:mb-8">
          <h2 className="text-xl lg:text-2xl font-semibold mb-3 lg:mb-4 text-gray-700">
            Add New Player
          </h2>
          <form onSubmit={handleAddPlayer} className="flex gap-3 lg:gap-4">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter player name"
              maxLength={30}
              className="flex-1 px-4 lg:px-6 py-3 lg:py-4 text-base lg:text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              className="px-6 lg:px-8 py-3 lg:py-4 bg-blue-500 text-white text-base lg:text-lg font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Add Player
            </button>
          </form>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mt-3 text-sm lg:text-base">
              {error}
            </div>
          )}
        </div>

        {/* Current Players */}
        <div className="mb-6 lg:mb-8">
          <h2 className="text-xl lg:text-2xl font-semibold mb-3 lg:mb-4 text-gray-700">
            Current Players ({players.length}) - {players.filter((p) => !p.forceSitOut).length}{" "}
            Active, {players.filter((p) => p.forceSitOut).length} Sitting
          </h2>

          {players.length === 0 ? (
            <p className="text-gray-500 text-base lg:text-lg italic">No players in session</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                    player.forceSitOut ? "bg-orange-100 border-2 border-orange-400" : "bg-gray-100"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm lg:text-base font-medium truncate block">
                      {player.name}
                      {player.forceSitOut && (
                        <span className="ml-2 text-orange-600 text-xs font-bold">
                          (Sitting Out)
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-600">
                      {player.wins}W - {player.losses}L • {player.gamesPlayed} games
                    </span>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => onToggleSitOut(player.id)}
                      className={`px-4 py-1.5 text-xs lg:text-sm font-semibold rounded-lg ${
                        player.forceSitOut
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-orange-500 text-white hover:bg-orange-600"
                      } transition-colors flex-shrink-0`}
                      disabled={loading}
                      title={player.forceSitOut ? "Allow to play" : "Sit out next round"}
                    >
                      {player.forceSitOut ? "Play" : "Sit"}
                    </button>
                    <button
                      onClick={() => handleRemovePlayer(player.id, player.name)}
                      className="text-red-500 hover:text-red-700 text-lg font-bold flex-shrink-0"
                      disabled={loading}
                      title="Remove player"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(() => {
            const minRequired = numCourts * 4;
            if (players.length < minRequired) {
              return (
                <p className="text-orange-600 mt-3 text-sm lg:text-base font-medium">
                  ⚠️ Need at least {minRequired} players to start a round ({numCourts}{" "}
                  {numCourts === 1 ? "court" : "courts"} × 4 players)
                </p>
              );
            }
            return null;
          })()}
          {(() => {
            const sittingCount = players.filter((p) => p.forceSitOut).length;
            const availableCount = players.length - sittingCount;
            const minRequired = numCourts * 4;
            if (sittingCount > 0 && availableCount < minRequired) {
              return (
                <p className="text-red-600 mt-3 text-sm lg:text-base font-bold bg-red-100 border-2 border-red-400 px-4 py-3 rounded-xl">
                  ⚠️ Not enough players available. {sittingCount} player(s) marked to sit out, need
                  at least {minRequired} available players.
                </p>
              );
            }
            return null;
          })()}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
          {/* Change Courts Button - Mobile only (Desktop has floating button) */}
          <button
            onClick={() => setShowCourtSelector(!showCourtSelector)}
            disabled={loading}
            className="lg:hidden flex-1 px-6 py-3 bg-purple-500 text-white text-base font-bold rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            {showCourtSelector ? "Hide Courts" : "Change Courts"}
          </button>

          <button
            onClick={onViewHistory}
            disabled={loading}
            className="flex-1 px-6 py-3 lg:py-4 bg-indigo-500 text-white text-base lg:text-lg font-bold rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            View History
          </button>
          <button
            onClick={onEditPreviousScores}
            disabled={loading || !hasCompletedRound}
            className="flex-1 px-6 py-3 lg:py-4 bg-yellow-500 text-white text-base lg:text-lg font-bold rounded-xl hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!hasCompletedRound ? "No completed round to edit" : "Edit previous round scores"}
          >
            Edit Previous Scores
          </button>
        </div>
      </div>
    </div>
  );
}
