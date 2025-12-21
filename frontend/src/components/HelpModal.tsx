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
                <li className="text-lg">Set the number of courts (default is 2)</li>
                <li className="text-lg">
                  Add players using the input field - you need at least 4 players per court
                </li>
                <li className="text-lg">Click "Start Game" when ready to begin your first round</li>
                <li className="text-lg">
                  Court assignments are automatically generated for fair play
                </li>
              </ol>
            </section>

            {/* During a Round */}
            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-3">During a Round</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li className="text-lg">
                  Players are automatically assigned to courts or the bench
                </li>
                <li className="text-lg">
                  The algorithm ensures variety - everyone plays with and against different people
                </li>
                <li className="text-lg">Benched players get priority in the next round</li>
                <li className="text-lg">Click "Enter Scores" when all courts finish playing</li>
              </ul>
            </section>

            {/* Entering Scores */}
            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-3">Entering Scores</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li className="text-lg">Enter the final score for each court</li>
                <li className="text-lg">Games are typically played to 11 points (win by 2)</li>
                <li className="text-lg">Once submitted, stats update automatically</li>
                <li className="text-lg">
                  Use "Edit Previous Scores" if you need to correct the last round
                </li>
              </ul>
            </section>

            {/* Player Management */}
            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-3">Managing Players</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li className="text-lg">
                  <strong>Add Players:</strong> Add new players between rounds at any time
                </li>
                <li className="text-lg">
                  <strong>Sit Out:</strong> Mark a player to sit out the next round (shows in
                  orange)
                </li>
                <li className="text-lg">
                  <strong>Remove:</strong> Permanently remove a player from the session (cannot
                  remove during active round)
                </li>
                <li className="text-lg">
                  <strong>Change Courts:</strong> Adjust the number of courts between rounds
                </li>
              </ul>
            </section>

            {/* Spectator Display */}
            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-3">Spectator Display</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li className="text-lg">
                  Navigate to <code className="bg-gray-100 px-2 py-1 rounded">/spectator</code> for
                  a TV/large monitor display
                </li>
                <li className="text-lg">
                  Shows a QR code and URL that others can scan to join and manage the session
                </li>
                <li className="text-lg">
                  Displays current court assignments and live player stats
                </li>
                <li className="text-lg">
                  Automatically updates every 2 seconds - perfect for passive viewing
                </li>
                <li className="text-lg">Stats auto-scroll on desktop displays</li>
              </ul>
            </section>

            {/* Mobile Features */}
            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-3">Mobile Features</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li className="text-lg">Fully optimized for phones and tablets</li>
                <li className="text-lg">Help and Reset buttons are at the bottom of the screen</li>
                <li className="text-lg">
                  Player stats flow naturally below the main content (no auto-scrolling)
                </li>
                <li className="text-lg">Compact layout minimizes scrolling</li>
              </ul>
            </section>

            {/* Tips */}
            <section>
              <h2 className="text-2xl font-bold text-green-600 mb-3">💡 Tips</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li className="text-lg">The rotation algorithm prioritizes variety and fairness</li>
                <li className="text-lg">
                  Player stats show: wins, losses, point differential, and rounds sat out
                </li>
                <li className="text-lg">On desktop, stats auto-scroll - hover to pause</li>
                <li className="text-lg">Use "View History" to see all past rounds and scores</li>
                <li className="text-lg">
                  Session state is automatically saved - refresh the page to restore your session
                </li>
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
        className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        title="Help"
      >
        <span className="text-xl">?</span>
        <span>Help</span>
      </button>
      <HelpModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
