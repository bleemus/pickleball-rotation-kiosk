import { Player } from "../types/game";

interface SessionSummaryProps {
    players: Player[];
    onResetSession: () => void;
    loading: boolean;
}

export function SessionSummary({ players, onResetSession, loading }: SessionSummaryProps) {
    // Sort players by wins (descending), then by point differential
    const sortedPlayers = [...players].sort((a, b) => {
        if (b.wins !== a.wins) {
            return b.wins - a.wins;
        }
        return b.pointDifferential - a.pointDifferential;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-6 lg:mb-12">
                    <h1 className="text-4xl lg:text-7xl font-bold text-white mb-4">
                        🏆 Session Complete! 🏆
                    </h1>
                    <p className="text-xl lg:text-3xl text-white opacity-90">
                        Final Rankings
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl p-6 lg:p-12 mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-gray-300">
                                    <th className="text-left py-4 px-2 lg:px-4 text-lg lg:text-2xl font-bold text-gray-800">
                                        Rank
                                    </th>
                                    <th className="text-left py-4 px-2 lg:px-4 text-lg lg:text-2xl font-bold text-gray-800">
                                        Player
                                    </th>
                                    <th className="text-center py-4 px-2 lg:px-4 text-lg lg:text-2xl font-bold text-gray-800">
                                        Wins
                                    </th>
                                    <th className="text-center py-4 px-2 lg:px-4 text-lg lg:text-2xl font-bold text-gray-800">
                                        Losses
                                    </th>
                                    <th className="text-center py-4 px-2 lg:px-4 text-lg lg:text-2xl font-bold text-gray-800">
                                        Games
                                    </th>
                                    <th className="text-center py-4 px-2 lg:px-4 text-lg lg:text-2xl font-bold text-gray-800">
                                        +/-
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedPlayers.map((player, index) => {
                                    const isTopThree = index < 3;
                                    const medalEmoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
                                    
                                    return (
                                        <tr
                                            key={player.id}
                                            className={`border-b border-gray-200 ${isTopThree ? 'bg-yellow-50' : ''}`}
                                        >
                                            <td className="py-4 px-2 lg:px-4 text-base lg:text-xl font-bold text-gray-800">
                                                {medalEmoji} {index + 1}
                                            </td>
                                            <td className="py-4 px-2 lg:px-4 text-base lg:text-xl font-bold text-gray-800">
                                                {player.name}
                                            </td>
                                            <td className="py-4 px-2 lg:px-4 text-base lg:text-xl text-center text-green-600 font-bold">
                                                {player.wins}
                                            </td>
                                            <td className="py-4 px-2 lg:px-4 text-base lg:text-xl text-center text-red-600 font-bold">
                                                {player.losses}
                                            </td>
                                            <td className="py-4 px-2 lg:px-4 text-base lg:text-xl text-center text-gray-700">
                                                {player.gamesPlayed}
                                            </td>
                                            <td className={`py-4 px-2 lg:px-4 text-base lg:text-xl text-center font-bold ${
                                                player.pointDifferential > 0 
                                                    ? 'text-green-600' 
                                                    : player.pointDifferential < 0 
                                                    ? 'text-red-600' 
                                                    : 'text-gray-600'
                                            }`}>
                                                {player.pointDifferential > 0 ? '+' : ''}{player.pointDifferential}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={onResetSession}
                        disabled={loading}
                        className="px-8 lg:px-12 py-4 lg:py-6 bg-red-500 text-white text-xl lg:text-3xl font-bold rounded-2xl hover:bg-red-600 transition-colors shadow-xl disabled:opacity-50"
                    >
                        Start New Session
                    </button>
                </div>
            </div>
        </div>
    );
}
