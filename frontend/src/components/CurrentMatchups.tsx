import { Round } from "../types/game";
import { BenchDisplay } from "./BenchDisplay";

interface CurrentMatchupsProps {
    round: Round;
    onEnterScores: () => void;
    onViewHistory: () => void;
    onCancelRound: () => void;
    onStartNextRound: () => void;
    onResetSession: () => void;
    loading: boolean;
}

export function CurrentMatchups({
    round,
    onEnterScores,
    onViewHistory,
    onCancelRound,
    onStartNextRound,
    onResetSession,
    loading,
}: CurrentMatchupsProps) {
    return (
        <div className="h-screen bg-gradient-to-br from-green-500 to-blue-600 p-3 lg:p-6 flex flex-col overflow-hidden">
            <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
                {/* Header - Fixed height */}
                <div className="text-center mb-3 lg:mb-4 flex-shrink-0">
                    <h1 className="text-3xl lg:text-5xl xl:text-6xl font-bold text-white mb-1 lg:mb-2">
                        Round {round.roundNumber}
                    </h1>
                    <p className="text-lg lg:text-xl xl:text-2xl text-white opacity-90">
                        Current Matchups
                    </p>
                </div>

                {/* Courts Grid - Flexible */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 mb-3 lg:mb-4 flex-1 min-h-0">
                    {round.matches.map((match) => (
                        <div
                            key={match.id}
                            className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl p-3 lg:p-6 flex flex-col"
                        >
                            <div className="text-center mb-3 lg:mb-4">
                                <h2 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-800">
                                    Court {match.courtNumber}
                                </h2>
                            </div>

                            <div className="space-y-2 lg:space-y-4 flex-1 flex flex-col justify-center">
                                {/* Team 1 */}
                                <div className="bg-blue-100 rounded-xl lg:rounded-2xl p-4 lg:p-6 flex flex-col items-center justify-center">
                                    <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800 text-center">
                                        {match.team1.player1.name}
                                    </p>
                                    <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800 text-center">
                                        {match.team1.player2.name}
                                    </p>
                                </div>

                                {/* VS Divider */}
                                <div className="text-center">
                                    <span className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-600">
                                        VS
                                    </span>
                                </div>

                                {/* Team 2 */}
                                <div className="bg-red-100 rounded-xl lg:rounded-2xl p-4 lg:p-6 flex flex-col items-center justify-center">
                                    <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800 text-center">
                                        {match.team2.player1.name}
                                    </p>
                                    <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800 text-center">
                                        {match.team2.player2.name}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Section - Fixed height */}
                <div className="flex-shrink-0">
                    {/* Bench Display */}
                    {round.benchedPlayers.length > 0 && (
                        <div className="mb-3 lg:mb-4">
                            <BenchDisplay players={round.benchedPlayers} />
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 lg:gap-4 justify-center">
                        <button
                            onClick={onCancelRound}
                            disabled={loading}
                            className="px-6 lg:px-8 py-3 lg:py-4 bg-gray-500 text-white text-base lg:text-lg xl:text-xl font-bold rounded-xl hover:bg-gray-600 transition-colors shadow-xl disabled:opacity-50"
                        >
                            Back to Manage
                        </button>
                        <button
                            onClick={onViewHistory}
                            disabled={loading}
                            className="px-6 lg:px-8 py-3 lg:py-4 bg-indigo-500 text-white text-base lg:text-lg xl:text-xl font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-xl disabled:opacity-50"
                        >
                            View History
                        </button>
                        <button
                            onClick={onEnterScores}
                            className="px-8 lg:px-12 py-3 lg:py-4 bg-yellow-400 text-gray-900 text-xl lg:text-2xl xl:text-3xl font-bold rounded-xl lg:rounded-2xl hover:bg-yellow-500 transition-colors shadow-xl"
                        >
                            Enter Scores
                        </button>
                        <button
                            onClick={onResetSession}
                            disabled={loading}
                            className="px-6 lg:px-8 py-3 lg:py-4 bg-red-500 text-white text-base lg:text-lg xl:text-xl font-bold rounded-xl hover:bg-red-600 transition-colors shadow-xl disabled:opacity-50"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
