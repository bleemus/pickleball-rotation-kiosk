import { useState } from "react";
import { Player } from "../types/game";

const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === "true";

interface PlayerSetupProps {
    players: Player[];
    onAddPlayer: (name: string) => void;
    onRemovePlayer: (playerId: string) => void;
    onStartGame: (numCourts: number) => void;
    onResetSession: () => void;
    loading: boolean;
}

export function PlayerSetup({
    players,
    onAddPlayer,
    onRemovePlayer,
    onStartGame,
    onResetSession,
    loading,
}: PlayerSetupProps) {
    const [playerName, setPlayerName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [numCourts, setNumCourts] = useState(2);

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

        if (
            players.some(
                (p) => p.name.toLowerCase() === playerName.toLowerCase(),
            )
        ) {
            setError("Player name already exists");
            return;
        }

        onAddPlayer(playerName.trim());
        setPlayerName("");
        setError(null);
    };

    const handleRemovePlayer = (playerId: string, playerName: string) => {
        if (
            confirm(
                `Are you sure you want to remove ${playerName} from the session?`,
            )
        ) {
            onRemovePlayer(playerId);
        }
    };

    const handleAutoFill = () => {
        const requiredPlayers = numCourts * 4;
        const playersToAdd = requiredPlayers - players.length;

        const adjectives = [
            "Quick",
            "Swift",
            "Mighty",
            "Clever",
            "Bold",
            "Brave",
            "Fierce",
            "Wild",
            "Silent",
            "Thunder",
        ];
        const nouns = [
            "Panda",
            "Tiger",
            "Eagle",
            "Wolf",
            "Bear",
            "Hawk",
            "Fox",
            "Lion",
            "Shark",
            "Dragon",
        ];

        for (let i = 0; i < playersToAdd; i++) {
            const adj =
                adjectives[Math.floor(Math.random() * adjectives.length)];
            const noun = nouns[Math.floor(Math.random() * nouns.length)];
            const num = Math.floor(Math.random() * 100);
            const name = `${adj}${noun}${num}`;

            // Check if name already exists, if so add another random number
            const finalName = players.some((p) => p.name === name)
                ? `${name}${Math.floor(Math.random() * 100)}`
                : name;

            onAddPlayer(finalName);
        }
    };

    const canStartGame = players.length >= numCourts * 4;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex">
            {/* Reset Button - Upper Left */}
            <button
                onClick={onResetSession}
                disabled={loading}
                className="fixed top-4 left-4 z-10 px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-lg disabled:opacity-50"
                title="Reset session"
            >
                Reset
            </button>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-4 lg:p-8 pr-80 xl:pr-96">
                <div className="bg-white rounded-3xl shadow-2xl p-6 lg:p-12 max-w-5xl w-full">
                    <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-center mb-6 lg:mb-8 text-gray-800">
                        Pickleball Kiosk
                    </h1>

                    <div className="mb-6 lg:mb-8">
                        <h2 className="text-2xl lg:text-3xl font-semibold mb-3 lg:mb-4 text-gray-700">
                            Add Players
                        </h2>
                        <p className="text-gray-600 text-lg lg:text-xl mb-4 lg:mb-6">
                            {canStartGame
                                ? "Press the Start Game button to begin"
                                : `Add at least ${numCourts * 4} players to start the game (${numCourts} ${numCourts === 1 ? "court" : "courts"} × 4 players)`}
                        </p>

                        <form
                            onSubmit={handleAddPlayer}
                            className="flex gap-3 lg:gap-4 mb-4 lg:mb-6"
                        >
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Enter player name"
                                maxLength={30}
                                className="flex-1 px-4 lg:px-6 py-3 lg:py-4 text-lg lg:text-xl xl:text-2xl border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                className="px-6 lg:px-8 py-3 lg:py-4 bg-blue-500 text-white text-lg lg:text-xl xl:text-2xl font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
                                disabled={loading}
                            >
                                Add
                            </button>
                            {DEBUG_MODE && !canStartGame && (
                                <button
                                    type="button"
                                    onClick={handleAutoFill}
                                    className="px-6 lg:px-8 py-3 lg:py-4 bg-purple-500 text-white text-lg lg:text-xl xl:text-2xl font-semibold rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50"
                                    disabled={loading}
                                    title="Auto-fill remaining players (Debug Mode)"
                                >
                                    🔧 Fill
                                </button>
                            )}
                        </form>

                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 lg:px-6 py-3 lg:py-4 rounded-xl mb-4 text-base lg:text-lg xl:text-xl">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="mb-6 lg:mb-8">
                        <h3 className="text-xl lg:text-2xl font-semibold mb-3 lg:mb-4 text-gray-700">
                            Players ({players.length})
                        </h3>

                        {players.length === 0 ? (
                            <p className="text-gray-500 text-lg lg:text-xl italic">
                                No players added yet
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                                {players.map((player) => (
                                    <div
                                        key={player.id}
                                        className="flex items-center justify-between bg-gray-100 px-4 lg:px-6 py-3 lg:py-4 rounded-xl"
                                    >
                                        <span className="text-base lg:text-lg xl:text-xl font-medium truncate mr-2">
                                            {player.name}
                                        </span>
                                        <button
                                            onClick={() =>
                                                handleRemovePlayer(
                                                    player.id,
                                                    player.name,
                                                )
                                            }
                                            className="text-red-500 hover:text-red-700 text-lg lg:text-xl font-bold flex-shrink-0"
                                            disabled={loading}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => onStartGame(numCourts)}
                        disabled={!canStartGame || loading}
                        className="w-full py-4 lg:py-6 bg-green-500 text-white text-2xl lg:text-3xl font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Starting..." : "Start Game"}
                    </button>

                    {!canStartGame && players.length > 0 && (
                        <p className="text-center text-gray-600 mt-3 lg:mt-4 text-base lg:text-lg">
                            Add {numCourts * 4 - players.length} more player
                            {numCourts * 4 - players.length !== 1 ? "s" : ""} to
                            start
                        </p>
                    )}
                </div>
            </div>

            {/* Right Sidebar - Court Selection */}
            <div className="fixed right-0 top-0 bottom-0 w-80 xl:w-96 bg-white border-l-2 lg:border-l-4 border-gray-300 shadow-2xl flex items-center justify-center p-6">
                <div className="text-center">
                    <h3 className="text-2xl lg:text-3xl font-bold mb-6 text-gray-800">
                        Number of Courts
                    </h3>
                    <div className="flex flex-col items-center gap-6">
                        <button
                            onClick={() => setNumCourts(numCourts + 1)}
                            disabled={loading}
                            className="w-20 h-20 bg-gray-300 text-gray-800 text-4xl font-bold rounded-2xl hover:bg-gray-400 transition-colors disabled:opacity-50"
                        >
                            +
                        </button>
                        <div className="text-center">
                            <div className="text-8xl lg:text-9xl font-bold text-gray-800">
                                {numCourts}
                            </div>
                            <div className="text-xl lg:text-2xl text-gray-600 mt-2">
                                {numCourts === 1 ? "Court" : "Courts"}
                            </div>
                        </div>
                        <button
                            onClick={() =>
                                setNumCourts(Math.max(1, numCourts - 1))
                            }
                            disabled={loading}
                            className="w-20 h-20 bg-gray-300 text-gray-800 text-4xl font-bold rounded-2xl hover:bg-gray-400 transition-colors disabled:opacity-50"
                        >
                            −
                        </button>
                    </div>
                    <p className="text-center text-gray-600 mt-6 text-base lg:text-lg">
                        Need at least {numCourts * 4} players
                    </p>
                </div>
            </div>
        </div>
    );
}
