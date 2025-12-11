import { useState } from "react";
import { Round } from "../types/game";

interface MatchScore {
    matchId: string;
    team1Score: string;
    team2Score: string;
}

interface ScoreEntryProps {
    round: Round;
    onSubmitScores: (
        scores: { matchId: string; team1Score: number; team2Score: number }[],
    ) => void;
    onCancel: () => void;
    loading: boolean;
}

export function ScoreEntry({
    round,
    onSubmitScores,
    onCancel,
    loading,
}: ScoreEntryProps) {
    const [scores, setScores] = useState<Record<string, MatchScore>>(
        Object.fromEntries(
            round.matches.map((match) => [
                match.id,
                {
                    matchId: match.id,
                    team1Score:
                        match.team1Score !== undefined
                            ? match.team1Score.toString()
                            : "",
                    team2Score:
                        match.team2Score !== undefined
                            ? match.team2Score.toString()
                            : "",
                },
            ]),
        ),
    );

    const [error, setError] = useState<string | null>(null);
    const [matchErrors, setMatchErrors] = useState<Record<string, string>>({});

    const handleScoreChange = (
        matchId: string,
        team: "team1" | "team2",
        value: string,
    ) => {
        // Only allow numbers
        const cleanValue = value.replace(/[^0-9]/g, "");

        setScores((prev) => ({
            ...prev,
            [matchId]: {
                ...prev[matchId],
                [`${team}Score`]: cleanValue,
            },
        }));

        // Clear match error when user starts editing
        setMatchErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[matchId];
            return newErrors;
        });
    };

    const handleSubmit = () => {
        const newMatchErrors: Record<string, string> = {};
        let hasError = false;

        // Validate all scores are entered and no ties
        for (const score of Object.values(scores)) {
            if (score.team1Score === "" || score.team2Score === "") {
                newMatchErrors[score.matchId] =
                    "Please enter scores for both teams";
                hasError = true;
            } else {
                const team1 = parseInt(score.team1Score) || 0;
                const team2 = parseInt(score.team2Score) || 0;
                if (team1 === team2) {
                    newMatchErrors[score.matchId] =
                        "Tie scores are not allowed";
                    hasError = true;
                }
            }
        }

        if (hasError) {
            setMatchErrors(newMatchErrors);
            setError("Please fix the errors below");
            return;
        }

        setError(null);
        setMatchErrors({});
        // Convert strings to numbers for submission
        const numericScores = Object.values(scores).map((score) => ({
            matchId: score.matchId,
            team1Score: parseInt(score.team1Score) || 0,
            team2Score: parseInt(score.team2Score) || 0,
        }));
        onSubmitScores(numericScores);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-600 p-4 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-6 lg:mb-12">
                    <h1 className="text-5xl lg:text-7xl xl:text-8xl font-bold text-white mb-3 lg:mb-4">
                        Round {round.roundNumber}
                    </h1>
                    <p className="text-2xl lg:text-3xl text-white opacity-90">
                        Enter Scores
                    </p>
                </div>

                {error && (
                    <div className="bg-red-100 border-2 border-red-400 text-red-700 px-6 lg:px-8 py-4 lg:py-6 rounded-2xl mb-6 lg:mb-8 text-lg lg:text-xl xl:text-2xl text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-6 lg:space-y-8 mb-6 lg:mb-12">
                    {round.matches.map((match) => (
                        <div
                            key={match.id}
                            className="bg-white rounded-3xl shadow-2xl p-5 lg:p-8"
                        >
                            <h2 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-center mb-5 lg:mb-8 text-gray-800">
                                Court {match.courtNumber}
                            </h2>

                            {matchErrors[match.id] && (
                                <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 lg:px-6 py-3 lg:py-4 rounded-xl mb-4 lg:mb-6 text-base lg:text-lg text-center font-semibold">
                                    {matchErrors[match.id]}
                                </div>
                            )}

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6 items-center">
                                {/* Team 1 */}
                                <div className="bg-blue-100 rounded-2xl p-4 lg:p-6">
                                    <h3 className="text-base lg:text-lg xl:text-xl font-semibold text-blue-800 mb-2 lg:mb-3">
                                        Team 1
                                    </h3>
                                    <div className="space-y-1 lg:space-y-2 mb-3 lg:mb-4">
                                        <p className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-800 truncate">
                                            {match.team1.player1.name}
                                        </p>
                                        <p className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-800 truncate">
                                            {match.team1.player2.name}
                                        </p>
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="-"
                                        value={scores[match.id].team1Score}
                                        onChange={(e) =>
                                            handleScoreChange(
                                                match.id,
                                                "team1",
                                                e.target.value,
                                            )
                                        }
                                        onFocus={(e) => e.target.select()}
                                        className="w-full px-3 lg:px-4 py-3 lg:py-4 text-2xl lg:text-3xl xl:text-4xl font-bold text-center border-2 border-blue-300 rounded-xl focus:outline-none focus:border-blue-500"
                                        disabled={loading}
                                    />
                                </div>

                                {/* VS */}
                                <div className="text-center">
                                    <span className="text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-600">
                                        VS
                                    </span>
                                </div>

                                {/* Team 2 */}
                                <div className="bg-red-100 rounded-2xl p-4 lg:p-6">
                                    <h3 className="text-base lg:text-lg xl:text-xl font-semibold text-red-800 mb-2 lg:mb-3">
                                        Team 2
                                    </h3>
                                    <div className="space-y-1 lg:space-y-2 mb-3 lg:mb-4">
                                        <p className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-800 truncate">
                                            {match.team2.player1.name}
                                        </p>
                                        <p className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-800 truncate">
                                            {match.team2.player2.name}
                                        </p>
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="-"
                                        value={scores[match.id].team2Score}
                                        onChange={(e) =>
                                            handleScoreChange(
                                                match.id,
                                                "team2",
                                                e.target.value,
                                            )
                                        }
                                        onFocus={(e) => e.target.select()}
                                        className="w-full px-3 lg:px-4 py-3 lg:py-4 text-2xl lg:text-3xl xl:text-4xl font-bold text-center border-2 border-red-300 rounded-xl focus:outline-none focus:border-red-500"
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-4 lg:gap-6">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 px-6 lg:px-8 py-4 lg:py-6 bg-gray-500 text-white text-xl lg:text-2xl xl:text-3xl font-bold rounded-2xl hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 px-6 lg:px-8 py-4 lg:py-6 bg-green-500 text-white text-xl lg:text-2xl xl:text-3xl font-bold rounded-2xl hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Submitting..." : "Submit Scores"}
                    </button>
                </div>
            </div>
        </div>
    );
}
