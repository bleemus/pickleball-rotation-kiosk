import { useEffect, useState, useRef } from "react";
import { Session } from "../types/game";
import { BenchDisplay } from "./BenchDisplay";
import { APP_NAME } from "../config";

interface SpectatorDisplayProps {
    apiUrl: string;
}

export function SpectatorDisplay({ apiUrl }: SpectatorDisplayProps) {
    const [session, setSession] = useState<Session | null>(null);
    const [error, setError] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState(false);

    // Poll for active session updates every 2 seconds
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const response = await fetch(`${apiUrl}/session/active`);
                if (!response.ok) {
                    if (response.status === 404) {
                        setError("No active game session");
                    } else {
                        throw new Error("Failed to fetch session");
                    }
                    return;
                }
                const data = await response.json();
                setSession(data);
                setError(null);
            } catch (err) {
                setError((err as Error).message);
            }
        };

        fetchSession();
        const interval = setInterval(fetchSession, 2000);

        return () => clearInterval(interval);
    }, [apiUrl]);

    // Auto-scroll effect for player stats
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !session) return;

        const SCROLL_SPEED = 2; // pixels per interval - smooth but faster
        const INTERVAL_MS = 20; // milliseconds between scrolls - frequent updates
        const PAUSE_AT_TOP = 2000; // 2 second pause at top
        const PAUSE_AT_BOTTOM = 2000; // 2 second pause at bottom

        let pauseUntil = 0;
        let atBottom = false;

        const autoScroll = () => {
            const now = Date.now();

            // Skip if hovering
            if (isHovering) {
                return;
            }

            // Wait for pause periods
            if (now < pauseUntil) {
                return;
            }

            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            const maxScroll = scrollHeight - clientHeight;

            // Only scroll if there's content to scroll
            if (maxScroll > 0) {
                const currentScroll = container.scrollTop;

                if (!atBottom && currentScroll < maxScroll) {
                    // Scroll down
                    container.scrollTop = Math.min(
                        currentScroll + SCROLL_SPEED,
                        maxScroll,
                    );

                    // Check if we reached bottom
                    if (container.scrollTop >= maxScroll - 1) {
                        atBottom = true;
                        pauseUntil = now + PAUSE_AT_BOTTOM;
                    }
                } else if (atBottom && currentScroll > 0) {
                    // Scroll up
                    container.scrollTop = Math.max(
                        currentScroll - SCROLL_SPEED,
                        0,
                    );

                    // Check if we reached top
                    if (container.scrollTop <= 1) {
                        atBottom = false;
                        pauseUntil = now + PAUSE_AT_TOP;
                    }
                }
            }
        };

        const intervalId = setInterval(autoScroll, INTERVAL_MS);

        return () => {
            clearInterval(intervalId);
        };
    }, [isHovering, session?.players.length]);

    if (error && error !== "No active game session") {
        return (
            <div className="h-screen bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center p-8">
                <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
                    <h1 className="text-4xl font-bold text-red-600 mb-4">Error</h1>
                    <p className="text-2xl text-gray-800">{error}</p>
                </div>
            </div>
        );
    }

    if (!session || error === "No active game session") {
        return (
            <div className="h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center p-8">
                <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-3xl text-center">
                    <h1 className="text-5xl font-bold text-gray-800 mb-6">Welcome to {APP_NAME}</h1>
                    <div className="text-left space-y-4 mb-8">
                        <p className="text-2xl text-gray-700">
                            <strong>To get started:</strong>
                        </p>
                        <ol className="list-decimal list-inside space-y-3 text-xl text-gray-700 ml-4">
                            <li>Open the main app on another device or browser tab</li>
                            <li>Add at least 4 players per court (e.g., 8 for 2 courts, 12 for 3 courts)</li>
                            <li>Click "Start Next Round" to begin</li>
                            <li>This spectator screen will automatically update</li>
                        </ol>
                        <div className="mt-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-300">
                            <p className="text-lg text-blue-800">
                                💡 <strong>Tip:</strong> Navigate to the root URL (<code className="bg-white px-2 py-1 rounded">/</code>) on your tablet or phone to manage the game
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const hasActiveRound = session.currentRound && !session.currentRound.completed;
    const round = session.currentRound;
    const lastCompletedRound = round && round.completed ? round : null;
    const previousRoundHistory = lastCompletedRound 
        ? session.gameHistory.filter(h => h.roundNumber === lastCompletedRound.roundNumber)
        : [];

    return (
        <div className="h-screen bg-gradient-to-br from-green-500 to-blue-600 flex">
            {/* Main Content - Courts and Bench */}
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="text-center mb-6 flex-shrink-0">
                    {hasActiveRound && round ? (
                        <>
                            <h1 className="text-6xl font-bold text-white mb-2">
                                Round {round.roundNumber}
                            </h1>
                            <p className="text-3xl text-white opacity-90">
                                Current Matchups
                            </p>
                        </>
                    ) : lastCompletedRound ? (
                        <>
                            <h1 className="text-6xl font-bold text-white mb-2">
                                Round {lastCompletedRound.roundNumber} Results
                            </h1>
                            <p className="text-3xl text-white opacity-90">
                                Start the next round to continue
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-6xl font-bold text-white mb-2">
                                Waiting for Round
                            </h1>
                            <p className="text-3xl text-white opacity-90">
                                Start the next round to begin
                            </p>
                        </>
                    )}
                </div>

                {/* Courts Grid - Show active round or previous round results */}
                {hasActiveRound && round ? (
                    <>
                        <div className={`grid ${getGridCols(round.matches.length)} gap-6 mb-6 flex-1 min-h-0 overflow-auto`}>
                            {round.matches.map((match) => (
                                <div
                                    key={match.id}
                                    className="bg-white rounded-3xl shadow-2xl p-6 flex flex-col min-h-0"
                                >
                                    <div className="text-center mb-4 flex-shrink-0">
                                        <h2 className="text-4xl font-bold text-gray-800">
                                            Court {match.courtNumber}
                                        </h2>
                                    </div>

                                    <div className="space-y-4 flex-1 flex flex-col justify-center">
                                        {/* Team 1 */}
                                        <div className="bg-blue-100 rounded-2xl p-6 flex flex-col items-center justify-center">
                                            <p className="text-3xl font-bold text-gray-800 text-center">
                                                {match.team1.player1.name}
                                            </p>
                                            <p className="text-3xl font-bold text-gray-800 text-center">
                                                {match.team1.player2.name}
                                            </p>
                                        </div>

                                        {/* VS Divider */}
                                        <div className="text-center flex-shrink-0">
                                            <span className="text-3xl font-bold text-gray-600">VS</span>
                                        </div>

                                        {/* Team 2 */}
                                        <div className="bg-red-100 rounded-2xl p-6 flex flex-col items-center justify-center">
                                            <p className="text-3xl font-bold text-gray-800 text-center">
                                                {match.team2.player1.name}
                                            </p>
                                            <p className="text-3xl font-bold text-gray-800 text-center">
                                                {match.team2.player2.name}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bench Display */}
                        {round.benchedPlayers.length > 0 && (
                            <div className="flex-shrink-0">
                                <BenchDisplay players={round.benchedPlayers} />
                            </div>
                        )}
                    </>
                ) : previousRoundHistory.length > 0 ? (
                    <div className={`grid ${getGridCols(previousRoundHistory.length)} gap-6 mb-6 flex-1 min-h-0 overflow-auto`}>
                        {previousRoundHistory.map((game) => {
                            const team1Won = game.team1Score > game.team2Score;
                            const team2Won = game.team2Score > game.team1Score;
                            
                            return (
                                <div
                                    key={game.matchId}
                                    className="bg-white rounded-3xl shadow-2xl p-6 flex flex-col min-h-0"
                                >
                                    <div className="text-center mb-4 flex-shrink-0">
                                        <h2 className="text-4xl font-bold text-gray-800">
                                            Court {game.courtNumber}
                                        </h2>
                                        <p className="text-lg text-gray-600">Final Score</p>
                                    </div>

                                    <div className="space-y-4 flex-1 flex flex-col justify-center">
                                        {/* Team 1 */}
                                        <div className={`rounded-2xl p-6 flex items-center justify-between ${team1Won ? 'bg-green-100 border-4 border-green-500' : 'bg-gray-100'}`}>
                                            <div className="flex-1">
                                                <p className="text-2xl font-bold text-gray-800 text-center">
                                                    {game.team1Players[0]}
                                                </p>
                                                <p className="text-2xl font-bold text-gray-800 text-center">
                                                    {game.team1Players[1]}
                                                </p>
                                            </div>
                                            <div className={`text-5xl font-bold ml-4 ${team1Won ? 'text-green-700' : 'text-gray-700'}`}>
                                                {game.team1Score}
                                            </div>
                                        </div>

                                        {/* Team 2 */}
                                        <div className={`rounded-2xl p-6 flex items-center justify-between ${team2Won ? 'bg-green-100 border-4 border-green-500' : 'bg-gray-100'}`}>
                                            <div className="flex-1">
                                                <p className="text-2xl font-bold text-gray-800 text-center">
                                                    {game.team2Players[0]}
                                                </p>
                                                <p className="text-2xl font-bold text-gray-800 text-center">
                                                    {game.team2Players[1]}
                                                </p>
                                            </div>
                                            <div className={`text-5xl font-bold ml-4 ${team2Won ? 'text-green-700' : 'text-gray-700'}`}>
                                                {game.team2Score}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : null}
            </div>

            {/* Sidebar - Player Stats */}
            <div 
                ref={scrollContainerRef}
                className="w-80 xl:w-96 bg-gray-800 bg-opacity-90 p-6 overflow-y-auto"
                style={{ scrollBehavior: "auto" }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <h2 className="text-3xl font-bold text-white mb-6 text-center">
                    Player Stats
                </h2>
                <div className="space-y-3">
                    {[...session.players]
                        .sort((a, b) => {
                            // Sort by wins desc, then point diff desc
                            if (b.wins !== a.wins) return b.wins - a.wins;
                            return b.pointDifferential - a.pointDifferential;
                        })
                        .map((player, index) => (
                            <div
                                key={player.id}
                                className="bg-white rounded-xl p-4 shadow-lg"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl font-bold text-gray-600">
                                            #{index + 1}
                                        </span>
                                        <span className="text-xl font-bold text-gray-800">
                                            {player.name}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="bg-green-100 rounded-lg p-2 text-center">
                                        <div className="text-xs text-gray-600">Wins</div>
                                        <div className="text-lg font-bold text-green-700">
                                            {player.wins}
                                        </div>
                                    </div>
                                    <div className="bg-red-100 rounded-lg p-2 text-center">
                                        <div className="text-xs text-gray-600">Losses</div>
                                        <div className="text-lg font-bold text-red-700">
                                            {player.losses}
                                        </div>
                                    </div>
                                    <div className="bg-orange-100 rounded-lg p-2 text-center">
                                        <div className="text-xs text-gray-600">Sat</div>
                                        <div className="text-lg font-bold text-orange-700">
                                            {player.roundsSatOut}
                                        </div>
                                    </div>
                                    <div className="bg-purple-100 rounded-lg p-2 text-center">
                                        <div className="text-xs text-gray-600">Diff</div>
                                        <div className="text-lg font-bold text-purple-700">
                                            {player.pointDifferential > 0 ? "+" : ""}
                                            {player.pointDifferential}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}

function getGridCols(numCourts: number): string {
    if (numCourts === 1) return "grid-cols-1";
    if (numCourts === 2) return "grid-cols-1 xl:grid-cols-2";
    if (numCourts === 3) return "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3";
    return "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";
}
