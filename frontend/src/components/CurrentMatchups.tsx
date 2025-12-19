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
    // Determine grid columns based on number of courts
    const numCourts = round.matches.length;
    const gridColsClass = 
        numCourts === 1 ? 'grid-cols-1' :
        numCourts === 2 ? 'grid-cols-1 xl:grid-cols-2' :
        numCourts === 3 ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' :
        'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
    
    // Check if all matches have scores
    const allMatchesComplete = round.matches.every(m => m.completed);
    const hasAnyScores = round.matches.some(m => m.completed);
    
    return (
        <div className="lg:h-screen bg-gradient-to-br from-green-500 to-blue-600 p-2 lg:p-6 flex flex-col lg:overflow-hidden">
            <div className="max-w-7xl mx-auto w-full flex flex-col lg:h-full">
                {/* Header - Fixed height */}
                <div className="text-center mb-2 lg:mb-4 flex-shrink-0">
                    <h1 className="text-2xl lg:text-5xl xl:text-6xl font-bold text-white mb-1 lg:mb-2">
                        Round {round.roundNumber}
                    </h1>
                    <p className="text-base lg:text-xl xl:text-2xl text-white opacity-90">
                        Current Matchups
                    </p>
                </div>

                {/* Courts Grid - Flexible */}
                <div className={`grid ${gridColsClass} gap-2 lg:gap-6 mb-2 lg:mb-4 lg:flex-1 lg:min-h-0 lg:overflow-auto`}>
                    {round.matches.map((match) => {
                        const team1Won = match.completed && match.team1Score! > match.team2Score!;
                        const team2Won = match.completed && match.team2Score! > match.team1Score!;
                        
                        return (
                            <div
                                key={match.id}
                                className="bg-white rounded-xl lg:rounded-3xl shadow-2xl p-2 lg:p-4 flex flex-col lg:min-h-0"
                            >
                                <div className="text-center mb-1 lg:mb-3 flex-shrink-0">
                                    <h2 className="text-lg lg:text-2xl xl:text-3xl font-bold text-gray-800">
                                        Court {match.courtNumber}
                                    </h2>
                                    {match.completed && (
                                        <p className="text-sm lg:text-base text-green-600 font-semibold">Score Entered</p>
                                    )}
                                </div>

                                <div className="space-y-1 lg:space-y-3 flex-1 flex flex-col justify-center lg:min-h-0">
                                    {/* Team 1 */}
                                    <div className={`rounded-lg lg:rounded-2xl p-2 lg:p-4 flex items-center justify-between ${
                                        team1Won 
                                            ? 'bg-green-200 border-2 border-green-600' 
                                            : 'bg-blue-100'
                                    }`}>
                                        <div className="flex-1">
                                            <p className="text-base lg:text-xl xl:text-2xl font-bold text-gray-800 text-center">
                                                {match.team1.player1.name}
                                            </p>
                                            <p className="text-base lg:text-xl xl:text-2xl font-bold text-gray-800 text-center">
                                                {match.team1.player2.name}
                                            </p>
                                        </div>
                                        {match.completed && (
                                            <div className={`ml-2 text-2xl lg:text-4xl font-bold ${team1Won ? 'text-green-700' : 'text-gray-600'}`}>
                                                {match.team1Score}
                                            </div>
                                        )}
                                    </div>

                                    {/* VS Divider */}
                                    <div className="text-center flex-shrink-0">
                                        <span className="text-sm lg:text-xl xl:text-2xl font-bold text-gray-600">
                                            VS
                                        </span>
                                    </div>

                                    {/* Team 2 */}
                                    <div className={`rounded-lg lg:rounded-2xl p-2 lg:p-4 flex items-center justify-between ${
                                        team2Won 
                                            ? 'bg-green-200 border-2 border-green-600' 
                                            : 'bg-red-100'
                                    }`}>
                                        <div className="flex-1">
                                            <p className="text-base lg:text-xl xl:text-2xl font-bold text-gray-800 text-center">
                                                {match.team2.player1.name}
                                            </p>
                                            <p className="text-base lg:text-xl xl:text-2xl font-bold text-gray-800 text-center">
                                                {match.team2.player2.name}
                                            </p>
                                        </div>
                                        {match.completed && (
                                            <div className={`ml-2 text-2xl lg:text-4xl font-bold ${team2Won ? 'text-green-700' : 'text-gray-600'}`}>
                                                {match.team2Score}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Section - Fixed height */}
                <div className="flex-shrink-0 pb-0 lg:pb-0">
                    {/* Bench Display */}
                    {round.benchedPlayers.length > 0 && (
                        <div className="mb-2 lg:mb-4">
                            <BenchDisplay players={round.benchedPlayers} />
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 justify-center lg:flex-wrap">
                        {/* Show "Start Next Round" if all matches complete, otherwise "Enter Scores" */}
                        {allMatchesComplete ? (
                            <button
                                onClick={onStartNextRound}
                                disabled={loading}
                                className="w-full lg:w-auto px-8 lg:px-12 py-3 lg:py-4 bg-green-500 text-white text-xl lg:text-2xl xl:text-3xl font-bold rounded-xl lg:rounded-2xl hover:bg-green-600 transition-colors shadow-xl order-1 lg:order-3 disabled:opacity-50"
                            >
                                {loading ? "Starting..." : "Start Next Round"}
                            </button>
                        ) : (
                            <button
                                onClick={onEnterScores}
                                className="w-full lg:w-auto px-8 lg:px-12 py-3 lg:py-4 bg-yellow-400 text-gray-900 text-xl lg:text-2xl xl:text-3xl font-bold rounded-xl lg:rounded-2xl hover:bg-yellow-500 transition-colors shadow-xl order-1 lg:order-3"
                            >
                                {hasAnyScores ? "Edit Scores" : "Enter Scores"}
                            </button>
                        )}

                        {/* Other buttons in a row on mobile */}
                        <div className="flex gap-2 lg:gap-4 order-2 lg:order-none">
                            <button
                                onClick={onCancelRound}
                                disabled={loading}
                                className="flex-1 lg:flex-none px-6 lg:px-8 py-3 lg:py-4 bg-gray-500 text-white text-base lg:text-lg xl:text-xl font-bold rounded-xl hover:bg-gray-600 transition-colors shadow-xl disabled:opacity-50"
                            >
                                Back to Manage
                            </button>
                            <button
                                onClick={onViewHistory}
                                disabled={loading}
                                className="flex-1 lg:flex-none px-6 lg:px-8 py-3 lg:py-4 bg-indigo-500 text-white text-base lg:text-lg xl:text-xl font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-xl disabled:opacity-50"
                            >
                                View History
                            </button>
                        </div>

                        <button
                            onClick={onResetSession}
                            disabled={loading}
                            className="hidden lg:block px-6 lg:px-8 py-3 lg:py-4 bg-red-500 text-white text-base lg:text-lg xl:text-xl font-bold rounded-xl hover:bg-red-600 transition-colors shadow-xl disabled:opacity-50"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
