import { useState, useEffect } from "react";
import { Round } from "../types/game";
import pickleballIcon from "../assets/icons/pickleball.png";

interface MatchScore {
  matchId: string;
  team1Score: string;
  team2Score: string;
}

interface ScoreEntryProps {
  round: Round;
  onSubmitScores: (scores: { matchId: string; team1Score: number; team2Score: number }[]) => void;
  onCancel: () => void;
  loading: boolean;
}

export function ScoreEntry({ round, onSubmitScores, onCancel, loading }: ScoreEntryProps) {
  const [scores, setScores] = useState<Record<string, MatchScore>>(
    Object.fromEntries(
      round.matches.map((match) => [
        match.id,
        {
          matchId: match.id,
          team1Score:
            match.team1Score !== undefined && match.team1Score !== null
              ? match.team1Score.toString()
              : "",
          team2Score:
            match.team2Score !== undefined && match.team2Score !== null
              ? match.team2Score.toString()
              : "",
        },
      ])
    )
  );

  const [error, setError] = useState<string | null>(null);
  const [matchErrors, setMatchErrors] = useState<Record<string, string>>({});

  // Reset scores state when round changes (critical for edit mode and round transitions)
  useEffect(() => {
    setScores(
      Object.fromEntries(
        round.matches.map((match) => [
          match.id,
          {
            matchId: match.id,
            team1Score:
              match.team1Score !== undefined && match.team1Score !== null
                ? match.team1Score.toString()
                : "",
            team2Score:
              match.team2Score !== undefined && match.team2Score !== null
                ? match.team2Score.toString()
                : "",
          },
        ])
      )
    );
    setError(null);
    setMatchErrors({});
  }, [round.roundNumber]); // Reset when round number changes

  // Helper function to get dynamic text size based on name length
  const getNameTextClass = (name: string, isMobile: boolean = false) => {
    const length = name.length;
    if (isMobile) {
      // Mobile sizes
      if (length > 20) return "text-xs";
      if (length > 15) return "text-xs";
      return "text-sm";
    } else {
      // Desktop sizes
      if (length > 20) return "text-base xl:text-lg";
      if (length > 15) return "text-lg xl:text-xl";
      return "text-xl xl:text-2xl";
    }
  };

  const handleScoreChange = (matchId: string, team: "team1" | "team2", value: string) => {
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

    // Only validate scores that have been entered (allow partial submission)
    const enteredScores: { matchId: string; team1Score: number; team2Score: number }[] = [];

    for (const score of Object.values(scores)) {
      const hasTeam1 = score.team1Score !== "";
      const hasTeam2 = score.team2Score !== "";

      // If either score is entered, both must be entered
      if (hasTeam1 || hasTeam2) {
        if (!hasTeam1 || !hasTeam2) {
          newMatchErrors[score.matchId] = "Please enter scores for both teams";
          hasError = true;
        } else {
          const team1 = parseInt(score.team1Score) || 0;
          const team2 = parseInt(score.team2Score) || 0;
          if (team1 === team2) {
            newMatchErrors[score.matchId] = "Tie scores are not allowed";
            hasError = true;
          } else {
            enteredScores.push({
              matchId: score.matchId,
              team1Score: team1,
              team2Score: team2,
            });
          }
        }
      }
    }

    if (hasError) {
      setMatchErrors(newMatchErrors);
      setError("Please fix the errors below");
      return;
    }

    // Must have at least one score entered
    if (enteredScores.length === 0) {
      setError("Please enter at least one score");
      return;
    }

    setError(null);
    setMatchErrors({});
    onSubmitScores(enteredScores);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-600 p-2 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-3 lg:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-7xl xl:text-8xl font-bold text-white mb-1 lg:mb-4">
            Round {round.roundNumber}
          </h1>
          <p className="text-base sm:text-lg lg:text-3xl text-white opacity-90">Enter Scores</p>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-3 lg:px-8 py-2 lg:py-6 rounded-xl lg:rounded-2xl mb-3 lg:mb-8 text-sm lg:text-xl xl:text-2xl text-center">
            {error}
          </div>
        )}

        <div className="space-y-3 lg:space-y-6 mb-4 lg:mb-12">
          {round.matches.map((match) => (
            <div
              key={match.id}
              className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl p-3 lg:p-8"
            >
              <h2 className="text-xl lg:text-3xl xl:text-4xl font-bold text-center mb-3 lg:mb-8 text-gray-800">
                Court {match.courtNumber}
              </h2>

              {matchErrors[match.id] && (
                <div className="bg-red-100 border-2 border-red-400 text-red-700 px-3 py-2 rounded-xl mb-3 text-sm lg:text-lg text-center font-semibold">
                  {matchErrors[match.id]}
                </div>
              )}

              {/* Mobile Layout (stacked) */}
              <div className="lg:hidden space-y-3">
                {/* Team 1 */}
                <div
                  className={`bg-blue-100 rounded-xl p-3 overflow-hidden ${match.servingTeam === 1 ? "border-2 border-blue-400" : ""}`}
                >
                  <h3 className="text-xs font-semibold text-blue-800 mb-1.5">Team 1</h3>
                  <div className="flex items-center gap-2">
                    {match.servingTeam === 1 ? (
                      <img src={pickleballIcon} alt="Serving" className="w-10 h-10 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 flex-shrink-0" />
                    )}
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <p
                        className={`${getNameTextClass(match.team1.player1.name, true)} font-bold text-gray-800 text-center truncate`}
                      >
                        {match.team1.player1.name}
                      </p>
                      <p
                        className={`${getNameTextClass(match.team1.player2.name, true)} font-bold text-gray-800 text-center truncate`}
                      >
                        {match.team1.player2.name}
                      </p>
                    </div>
                    {match.servingTeam === 1 ? (
                      <img src={pickleballIcon} alt="Serving" className="w-10 h-10 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 flex-shrink-0" />
                    )}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Score"
                    value={scores[match.id].team1Score}
                    onChange={(e) => handleScoreChange(match.id, "team1", e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full mt-2 px-3 py-2 text-xl font-bold text-center border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                    disabled={loading}
                  />
                </div>

                {/* Team 2 */}
                <div
                  className={`bg-red-100 rounded-xl p-3 overflow-hidden ${match.servingTeam === 2 ? "border-2 border-red-400" : ""}`}
                >
                  <h3 className="text-xs font-semibold text-red-800 mb-1.5">Team 2</h3>
                  <div className="flex items-center gap-2">
                    {match.servingTeam === 2 ? (
                      <img src={pickleballIcon} alt="Serving" className="w-10 h-10 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 flex-shrink-0" />
                    )}
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <p
                        className={`${getNameTextClass(match.team2.player1.name, true)} font-bold text-gray-800 text-center truncate`}
                      >
                        {match.team2.player1.name}
                      </p>
                      <p
                        className={`${getNameTextClass(match.team2.player2.name, true)} font-bold text-gray-800 text-center truncate`}
                      >
                        {match.team2.player2.name}
                      </p>
                    </div>
                    {match.servingTeam === 2 ? (
                      <img src={pickleballIcon} alt="Serving" className="w-10 h-10 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 flex-shrink-0" />
                    )}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Score"
                    value={scores[match.id].team2Score}
                    onChange={(e) => handleScoreChange(match.id, "team2", e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full mt-2 px-3 py-2 text-xl font-bold text-center border-2 border-red-300 rounded-lg focus:outline-none focus:border-red-500"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Desktop/Tablet Layout (side by side) */}
              <div className="hidden lg:grid grid-cols-3 gap-6 items-center">
                {/* Team 1 */}
                <div
                  className={`bg-blue-100 rounded-2xl p-6 overflow-hidden ${match.servingTeam === 1 ? "border-2 border-blue-400" : ""}`}
                >
                  <h3 className="text-lg xl:text-xl font-semibold text-blue-800 mb-3 text-center">
                    Team 1
                  </h3>
                  <div className="flex items-center gap-3 mb-4">
                    {match.servingTeam === 1 ? (
                      <img src={pickleballIcon} alt="Serving" className="w-16 h-16 flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 flex-shrink-0" />
                    )}
                    <div className="flex-1 space-y-2 min-w-0">
                      <p
                        className={`${getNameTextClass(match.team1.player1.name)} font-bold text-gray-800 text-center truncate`}
                      >
                        {match.team1.player1.name}
                      </p>
                      <p
                        className={`${getNameTextClass(match.team1.player2.name)} font-bold text-gray-800 text-center truncate`}
                      >
                        {match.team1.player2.name}
                      </p>
                    </div>
                    {match.servingTeam === 1 ? (
                      <img src={pickleballIcon} alt="Serving" className="w-16 h-16 flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 flex-shrink-0" />
                    )}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Score"
                    value={scores[match.id].team1Score}
                    onChange={(e) => handleScoreChange(match.id, "team1", e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-4 text-3xl xl:text-4xl font-bold text-center border-2 border-blue-300 rounded-xl focus:outline-none focus:border-blue-500"
                    disabled={loading}
                  />
                </div>

                {/* VS */}
                <div className="text-center">
                  <span className="text-4xl xl:text-5xl font-bold text-gray-600">VS</span>
                </div>

                {/* Team 2 */}
                <div
                  className={`bg-red-100 rounded-2xl p-6 overflow-hidden ${match.servingTeam === 2 ? "border-2 border-red-400" : ""}`}
                >
                  <h3 className="text-lg xl:text-xl font-semibold text-red-800 mb-3 text-center">
                    Team 2
                  </h3>
                  <div className="flex items-center gap-3 mb-4">
                    {match.servingTeam === 2 ? (
                      <img src={pickleballIcon} alt="Serving" className="w-16 h-16 flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 flex-shrink-0" />
                    )}
                    <div className="flex-1 space-y-2 min-w-0">
                      <p
                        className={`${getNameTextClass(match.team2.player1.name)} font-bold text-gray-800 text-center truncate`}
                      >
                        {match.team2.player1.name}
                      </p>
                      <p
                        className={`${getNameTextClass(match.team2.player2.name)} font-bold text-gray-800 text-center truncate`}
                      >
                        {match.team2.player2.name}
                      </p>
                    </div>
                    {match.servingTeam === 2 ? (
                      <img src={pickleballIcon} alt="Serving" className="w-16 h-16 flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 flex-shrink-0" />
                    )}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Score"
                    value={scores[match.id].team2Score}
                    onChange={(e) => handleScoreChange(match.id, "team2", e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-4 text-3xl xl:text-4xl font-bold text-center border-2 border-red-300 rounded-xl focus:outline-none focus:border-red-500"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 lg:gap-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 lg:px-8 py-3 lg:py-6 bg-gray-500 text-white text-base lg:text-2xl xl:text-3xl font-bold rounded-xl lg:rounded-2xl hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 lg:px-8 py-3 lg:py-6 bg-green-500 text-white text-base lg:text-2xl xl:text-3xl font-bold rounded-xl lg:rounded-2xl hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Scores"}
          </button>
        </div>
      </div>
    </div>
  );
}
