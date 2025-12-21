import { Player } from "../types/game";

interface AdminControlsProps {
  players: Player[];
  onViewHistory: () => void;
  onResetSession: () => void;
  onStartNextRound: () => void;
  canStartRound: boolean;
  loading: boolean;
}

export function AdminControls({
  players,
  onViewHistory,
  onResetSession,
  onStartNextRound,
  canStartRound,
  loading,
}: AdminControlsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 lg:border-t-4 border-gray-300 shadow-2xl">
      <div className="max-w-7xl mx-auto p-3 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:gap-4">
          {/* Player Stats */}
          <div className="lg:col-span-2 bg-gray-100 rounded-xl p-3 lg:p-4">
            <h3 className="text-base lg:text-lg font-semibold mb-2 text-gray-700">Player Stats</h3>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 max-h-24 lg:max-h-32 overflow-y-auto">
              {players.map((player) => (
                <div key={player.id} className="text-xs lg:text-sm">
                  <span className="font-medium truncate inline-block max-w-[80px] lg:max-w-none">
                    {player.name}:
                  </span>{" "}
                  <span className="text-green-600">{player.wins}W</span>-
                  <span className="text-red-600">{player.losses}L</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <button
            onClick={onViewHistory}
            disabled={loading}
            className="px-4 lg:px-6 py-3 lg:py-4 bg-indigo-500 text-white text-base lg:text-lg xl:text-xl font-bold rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            View History
          </button>

          {canStartRound && (
            <button
              onClick={onStartNextRound}
              disabled={loading}
              className="px-4 lg:px-6 py-3 lg:py-4 bg-green-500 text-white text-base lg:text-lg xl:text-xl font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Starting..." : "Next Round"}
            </button>
          )}

          {!canStartRound && (
            <button
              onClick={onResetSession}
              disabled={loading}
              className="px-4 lg:px-6 py-3 lg:py-4 bg-red-500 text-white text-base lg:text-lg xl:text-xl font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              Reset Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
