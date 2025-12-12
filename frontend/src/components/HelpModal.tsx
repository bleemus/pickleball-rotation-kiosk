import { useState } from "react";

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-4xl font-bold text-gray-800">How to Use</h1>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-4xl font-bold leading-none"
                        >
                            ×
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        {/* Getting Started */}
                        <section>
                            <h2 className="text-2xl font-bold text-blue-600 mb-3">Getting Started</h2>
                            <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                <li className="text-lg">Add players using the "Add New Player" form</li>
                                <li className="text-lg">Set the number of courts (default is 2)</li>
                                <li className="text-lg">You need at least 4 players per court (e.g., 8 for 2 courts, 12 for 3 courts)</li>
                                <li className="text-lg">Click "Start Next Round" when ready to begin</li>
                            </ol>
                        </section>

                        {/* During a Round */}
                        <section>
                            <h2 className="text-2xl font-bold text-blue-600 mb-3">During a Round</h2>
                            <ul className="list-disc list-inside space-y-2 text-gray-700">
                                <li className="text-lg">Players will be assigned to courts or the bench automatically</li>
                                <li className="text-lg">The algorithm ensures fair rotation - everyone plays with and against different people</li>
                                <li className="text-lg">Benched players are rotated to minimize sitting out</li>
                                <li className="text-lg">Enter scores for each court when games complete</li>
                            </ul>
                        </section>

                        {/* Entering Scores */}
                        <section>
                            <h2 className="text-2xl font-bold text-blue-600 mb-3">Entering Scores</h2>
                            <ul className="list-disc list-inside space-y-2 text-gray-700">
                                <li className="text-lg">Click on a court to enter the final score</li>
                                <li className="text-lg">Games are played to 11 points (win by 2)</li>
                                <li className="text-lg">Once all scores are entered, complete the round</li>
                                <li className="text-lg">Stats will update automatically (wins, losses, point differential)</li>
                            </ul>
                        </section>

                        {/* Player Management */}
                        <section>
                            <h2 className="text-2xl font-bold text-blue-600 mb-3">Managing Players</h2>
                            <ul className="list-disc list-inside space-y-2 text-gray-700">
                                <li className="text-lg"><strong>Sit Button:</strong> Force a player to sit out the next round</li>
                                <li className="text-lg"><strong>Remove (×):</strong> Permanently remove a player from the session</li>
                                <li className="text-lg">Add new players at any time between rounds</li>
                                <li className="text-lg">Players marked to sit will show in orange</li>
                            </ul>
                        </section>

                        {/* Other Features */}
                        <section>
                            <h2 className="text-2xl font-bold text-blue-600 mb-3">Other Features</h2>
                            <ul className="list-disc list-inside space-y-2 text-gray-700">
                                <li className="text-lg"><strong>View History:</strong> See all completed rounds and scores</li>
                                <li className="text-lg"><strong>Edit Previous Scores:</strong> Correct scores from the last round</li>
                                <li className="text-lg"><strong>Change Courts:</strong> Adjust number of courts between rounds</li>
                                <li className="text-lg"><strong>Reset:</strong> Start a completely new session (top-left button)</li>
                                <li className="text-lg"><strong>Player Stats:</strong> View on the right side - shows wins, losses, sat rounds, and point differential</li>
                            </ul>
                        </section>

                        {/* Spectator Display */}
                        <section>
                            <h2 className="text-2xl font-bold text-blue-600 mb-3">Spectator Display</h2>
                            <ul className="list-disc list-inside space-y-2 text-gray-700">
                                <li className="text-lg">Navigate to <code className="bg-gray-100 px-2 py-1 rounded">/spectator</code> for a big screen display</li>
                                <li className="text-lg">Shows current court assignments and player stats</li>
                                <li className="text-lg">Automatically updates every 2 seconds</li>
                                <li className="text-lg">Perfect for displaying on a TV or large monitor</li>
                            </ul>
                        </section>

                        {/* Tips */}
                        <section>
                            <h2 className="text-2xl font-bold text-green-600 mb-3">💡 Tips</h2>
                            <ul className="list-disc list-inside space-y-2 text-gray-700">
                                <li className="text-lg">The rotation algorithm optimizes for fair partnerships and matchups</li>
                                <li className="text-lg">Players who've sat out more will be prioritized for courts</li>
                                <li className="text-lg">Stats auto-scroll on the right side - hover to pause</li>
                                <li className="text-lg">Use debug mode (VITE_DEBUG_MODE=true) to quickly fill test players</li>
                            </ul>
                        </section>
                    </div>

                    {/* Close Button */}
                    <div className="mt-8 text-center">
                        <button
                            onClick={onClose}
                            className="px-8 py-4 bg-blue-500 text-white text-xl font-bold rounded-xl hover:bg-blue-600 transition-colors"
                        >
                            Got It!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function HelpButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-[22rem] xl:right-[26rem] w-16 h-16 bg-blue-500 text-white rounded-full shadow-2xl hover:bg-blue-600 transition-all hover:scale-110 flex items-center justify-center z-40"
                title="Help"
            >
                <span className="text-3xl font-bold">?</span>
            </button>
            <HelpModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
