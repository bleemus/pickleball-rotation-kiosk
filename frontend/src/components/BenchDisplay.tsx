import { Player } from "../types/game";

interface BenchDisplayProps {
    players: Player[];
}

export function BenchDisplay({ players }: BenchDisplayProps) {
    if (players.length === 0) {
        return null;
    }

    return (
        <div className="bg-white bg-opacity-90 rounded-2xl lg:rounded-3xl shadow-2xl p-3 lg:p-5">
            <h2 className="text-lg lg:text-xl xl:text-2xl font-bold text-center mb-2 lg:mb-3 text-gray-800">
                On the Bench
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-3">
                {players.map((player) => (
                    <div
                        key={player.id}
                        className="bg-gray-200 rounded-lg lg:rounded-xl p-2 lg:p-3 text-center"
                    >
                        <p className="text-sm lg:text-base xl:text-lg font-bold text-gray-800 truncate">
                            {player.name}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                            Sat out: {player.roundsSatOut}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
