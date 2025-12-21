import { GameHistory } from "../types/game";

interface ScoreHistoryProps {
  history: GameHistory[];
  onClose: () => void;
}

export function ScoreHistory({ history, onClose }: ScoreHistoryProps) {
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 lg:mb-12 gap-3">
          <h1 className="text-3xl lg:text-5xl xl:text-7xl font-bold text-white">Game History</h1>
          <button
            onClick={onClose}
            className="px-5 lg:px-8 py-3 lg:py-4 bg-white text-gray-800 text-base lg:text-xl xl:text-2xl font-bold rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            Close
          </button>
        </div>

        {sortedHistory.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 text-center">
            <p className="text-2xl lg:text-3xl text-gray-600">No games played yet</p>
          </div>
        ) : (
          <div className="space-y-4 lg:space-y-6">
            {sortedHistory.map((game) => (
              <div key={game.matchId} className="bg-white rounded-2xl shadow-xl p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-start mb-4 gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-800">
                      Round {game.roundNumber} - Court {game.courtNumber}
                    </h3>
                    <p className="text-sm lg:text-base text-gray-600">
                      {new Date(game.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-left lg:text-right flex items-center gap-2">
                    <span
                      className={`text-2xl lg:text-3xl xl:text-4xl font-bold ${
                        game.team1Score > game.team2Score ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {game.team1Score}
                    </span>
                    <span className="text-xl lg:text-2xl xl:text-3xl text-gray-500">-</span>
                    <span
                      className={`text-2xl lg:text-3xl xl:text-4xl font-bold ${
                        game.team2Score > game.team1Score ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {game.team2Score}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                  <div
                    className={`p-3 lg:p-4 rounded-xl ${
                      game.team1Score > game.team2Score
                        ? "bg-green-100 border-2 border-green-400"
                        : "bg-gray-100"
                    }`}
                  >
                    <h4 className="text-base lg:text-lg font-semibold mb-2 text-gray-700">
                      Team 1
                      {game.team1Score > game.team2Score && (
                        <span className="ml-2 text-green-600 text-sm lg:text-base">🏆 Winners</span>
                      )}
                    </h4>
                    {game.team1Players.map((player, idx) => (
                      <p
                        key={idx}
                        className="text-base lg:text-lg xl:text-xl font-medium text-gray-800 truncate"
                      >
                        {player}
                      </p>
                    ))}
                  </div>

                  <div
                    className={`p-3 lg:p-4 rounded-xl ${
                      game.team2Score > game.team1Score
                        ? "bg-green-100 border-2 border-green-400"
                        : "bg-gray-100"
                    }`}
                  >
                    <h4 className="text-base lg:text-lg font-semibold mb-2 text-gray-700">
                      Team 2
                      {game.team2Score > game.team1Score && (
                        <span className="ml-2 text-green-600 text-sm lg:text-base">🏆 Winners</span>
                      )}
                    </h4>
                    {game.team2Players.map((player, idx) => (
                      <p key={idx} className="text-xl font-medium text-gray-800">
                        {player}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
