import { useEffect, useState, useRef } from "react";
import QRCode from "react-qr-code";
import { Session } from "../types/game";
import { BenchDisplay } from "./BenchDisplay";
import { APP_NAME, SPECTATOR_DARK_MODE } from "../config";

interface SpectatorDisplayProps {
    apiUrl: string;
}

export function SpectatorDisplay({ apiUrl }: SpectatorDisplayProps) {
    const [session, setSession] = useState<Session | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [networkInfo, setNetworkInfo] = useState<{ hostname: string; ip: string | null; port: string; allIPs?: { interface: string; ip: string }[] } | null>(null);
    const [wifiSSID, setWifiSSID] = useState<string | null>(null);
    const [wifiPassword, setWifiPassword] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const summaryScrollRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const darkMode = SPECTATOR_DARK_MODE;
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Track mobile screen size
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Track window size for auto-scroll behavior
    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch network info on mount
    useEffect(() => {
        const fetchNetworkInfo = async () => {
            try {
                const response = await fetch(`${apiUrl}/network-info`);
                if (response.ok) {
                    const data = await response.json();
                    setNetworkInfo(data);
                } else {
                    // If network info fetch fails, set empty object so we don't block rendering
                    setNetworkInfo({ hostname: '', ip: null, port: '', allIPs: [] });
                }
            } catch (err) {
                console.error("Failed to fetch network info:", err);
                // Set empty object so we don't block rendering
                setNetworkInfo({ hostname: '', ip: null, port: '', allIPs: [] });
            }
        };
        fetchNetworkInfo();
    }, [apiUrl]);

    // Fetch WiFi info on mount
    useEffect(() => {
        const fetchWifiInfo = async () => {
            try {
                const response = await fetch(`${apiUrl}/wifi-info`);
                if (response.ok) {
                    const data = await response.json();
                    setWifiSSID(data.ssid);
                    setWifiPassword(data.password || null);
                }
            } catch (err) {
                // WiFi info not available - not configured
            }
        };
        fetchWifiInfo();
    }, [apiUrl]);

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

    // Auto-scroll effect for player stats (desktop only)
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !session || !isDesktop || session.ended) return;

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
    }, [isHovering, isDesktop, session?.players.length]);

    // Auto-scroll effect for session summary
    useEffect(() => {
        const container = summaryScrollRef.current;
        if (!container || !session || !session.ended) return;

        const SCROLL_SPEED = 1.5;
        const INTERVAL_MS = 20;
        const PAUSE_AT_TOP = 500; // Reduced from 3000 to start scrolling faster
        const PAUSE_AT_BOTTOM = 500; // Reduced from 3000

        let pauseUntil = Date.now() + PAUSE_AT_TOP; // Start with initial pause
        let scrollingDown = true; // Track direction

        const autoScroll = () => {
            const now = Date.now();

            // If we're in a pause period, skip scrolling
            if (now < pauseUntil) return;

            const { scrollTop, scrollHeight, clientHeight } = container;
            const maxScroll = scrollHeight - clientHeight;

            // If content doesn't overflow, no need to scroll
            if (maxScroll <= 0) return;

            if (scrollingDown) {
                // Scroll down
                container.scrollTop += SCROLL_SPEED;

                // Check if we reached the bottom
                if (scrollTop >= maxScroll - 5) {
                    scrollingDown = false;
                    pauseUntil = now + PAUSE_AT_BOTTOM;
                }
            } else {
                // Scroll up
                container.scrollTop -= SCROLL_SPEED;

                // Check if we reached the top
                if (scrollTop <= 5) {
                    scrollingDown = true;
                    pauseUntil = now + PAUSE_AT_TOP;
                }
            }
        };

        const interval = setInterval(autoScroll, INTERVAL_MS);
        return () => clearInterval(interval);
    }, [summaryScrollRef, session?.ended]);

    // Show mobile redirect message
    if (isMobile) {
        const entryUrl = window.location.origin + window.location.pathname.replace(/\/spectator$/, '');
        return (
            <div className={`h-screen flex items-center justify-center p-6 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-500 to-blue-600'}`}>
                <div className={`rounded-3xl shadow-2xl p-8 max-w-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="text-6xl mb-4">📱</div>
                    <h1 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        Mobile Device Detected
                    </h1>
                    <p className={`text-lg mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        The spectator view is designed for larger displays like TVs and monitors.
                        Please use the main entry screen to manage games on mobile devices.
                    </p>
                    <a
                        href={entryUrl}
                        className={`inline-block px-8 py-4 rounded-xl font-bold text-lg transition-colors ${
                            darkMode
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                    >
                        Go to Entry Screen
                    </a>
                </div>
            </div>
        );
    }

    if (error && error !== "No active game session") {
        return (
            <div className={`h-screen flex items-center justify-center p-8 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-red-500 to-pink-600'}`}>
                <div className={`rounded-3xl shadow-2xl p-12 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <h1 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Error</h1>
                    <p className={`text-2xl ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{error}</p>
                </div>
            </div>
        );
    }

    if (!session || error === "No active game session") {
        // Don't render until network info is loaded to avoid showing wrong IP
        if (!networkInfo) {
            return (
                <div className={`h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-500 to-blue-600'}`}>
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
                        <p className="text-white text-xl font-semibold">Loading...</p>
                    </div>
                </div>
            );
        }

        // Determine the best URL to show
        const currentHostname = window.location.hostname;
        const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1';

        // Construct the URL to display
        let displayUrl = window.location.origin;
        let urlSource = 'current';

        // Always prefer showing the network IP address if available
        // This ensures .local hostnames don't get displayed (better for cross-device connectivity)
        if (networkInfo && networkInfo.ip) {
            const protocol = window.location.protocol;
            const port = window.location.port ? `:${window.location.port}` : '';
            displayUrl = `${protocol}//${networkInfo.ip}${port}`;
            urlSource = 'network';
        }

        // Remove /spectator from the URL if present
        const baseUrl = displayUrl.replace(/\/spectator$/, '');

        // Generate WiFi QR code string for welcome screen
        const wifiQRString = wifiSSID
            ? (wifiPassword
                ? `WIFI:S:${wifiSSID};T:WPA;P:${wifiPassword};;`
                : `WIFI:S:${wifiSSID};T:nopass;;`)
            : null;

        return (
            <div className={`h-screen flex items-center justify-center p-8 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-500 to-blue-600'}`}>
                {/* WiFi QR Code - Top Left */}
                {wifiQRString && (
                    <div className="fixed top-4 left-4 z-50 space-y-3">
                        <div className={`rounded-xl shadow-2xl p-5 ${darkMode ? 'bg-gray-800 border-2 border-blue-500' : 'bg-white border-2 border-blue-400'}`}>
                            <div className="flex flex-col items-center">
                                <p className={`text-lg font-bold mb-2 text-center ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                    Step 1: Connect to WiFi
                                </p>
                                <QRCode
                                    value={wifiQRString}
                                    size={150}
                                    level="M"
                                />
                                <p className={`text-base mt-2 text-center font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {wifiSSID}
                                </p>
                                <p className={`text-xs mt-1 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Scan to connect
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <div className={`rounded-3xl shadow-2xl p-12 max-w-4xl text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <h1 className={`text-5xl font-bold mb-6 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Welcome to {APP_NAME}</h1>

                    {/* Localhost Info - Changed from warning to informational */}
                    {isLocalhost && urlSource === 'network' && (
                        <div className={`mb-6 p-4 border-2 rounded-xl ${darkMode ? 'bg-blue-900 border-blue-500' : 'bg-blue-50 border-blue-400'}`}>
                            <p className={`text-lg font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                                ℹ️ Network Address Detected
                            </p>
                            <p className={`text-sm mt-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                You're viewing this page locally, but we've detected your network address below.
                                Other devices should connect using that address.
                            </p>
                        </div>
                    )}

                    {/* Prominent URL Display with QR Code */}
                    <div className={`mb-8 p-6 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-green-500 to-blue-600'}`}>
                        <p className={`text-2xl font-bold mb-4 ${darkMode ? 'text-gray-200' : 'text-white'}`}>
                            To start a game, connect to:
                        </p>

                        {/* QR Code */}
                        <div className="bg-white rounded-xl p-6 shadow-inner mb-4 flex justify-center">
                            <QRCode
                                value={baseUrl}
                                size={200}
                                level="M"
                            />
                        </div>

                        {/* URL Text */}
                        <div className="bg-white rounded-xl p-4 shadow-inner">
                            <code className="text-2xl lg:text-3xl font-bold text-gray-800 break-all">
                                {baseUrl}
                            </code>
                        </div>
                        <p className={`text-lg mt-3 opacity-90 ${darkMode ? 'text-gray-300' : 'text-white'}`}>
                            Scan the QR code or open the URL on your device
                        </p>
                    </div>

                    <div className="text-left space-y-4 mb-8">
                        <p className={`text-2xl ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <strong>Setup Instructions:</strong>
                        </p>
                        <ol className={`list-decimal list-inside space-y-3 text-xl ml-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <li>Connect to the URL above from another device</li>
                            <li>Add at least 4 players per court (e.g., 8 for 2 courts, 12 for 3 courts)</li>
                            <li>Click "Start Next Round" to begin</li>
                            <li>This spectator screen will automatically update</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    // Show session summary if session has ended
    if (session?.ended) {
        const sortedPlayers = [...session.players].sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.pointDifferential - a.pointDifferential;
        });

        return (
            <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-600 to-blue-600'}`}>
                {/* Fixed Header */}
                <div className="flex-shrink-0 text-center py-6">
                    <h1 className={`text-6xl font-bold mb-4 ${darkMode ? 'text-gray-200' : 'text-white'}`}>
                        🏆 Session Complete! 🏆
                    </h1>
                    <p className={`text-4xl opacity-90 ${darkMode ? 'text-gray-300' : 'text-white'}`}>
                        Final Rankings
                    </p>
                </div>

                {/* Scrollable Rankings Table */}
                <div 
                    ref={summaryScrollRef}
                    className="flex-1 px-6 pb-6 overflow-y-auto"
                    style={{ scrollBehavior: "auto" }}
                >
                    <div className="max-w-6xl mx-auto">
                        <div className={`rounded-3xl shadow-2xl p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                            <table className="w-full">
                                <thead>
                                    <tr className={`border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                        <th className={`text-left py-6 px-4 text-3xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            Rank
                                        </th>
                                        <th className={`text-left py-6 px-4 text-3xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            Player
                                        </th>
                                        <th className={`text-center py-6 px-4 text-3xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            Wins
                                        </th>
                                        <th className={`text-center py-6 px-4 text-3xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            Losses
                                        </th>
                                        <th className={`text-center py-6 px-4 text-3xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            Games
                                        </th>
                                        <th className={`text-center py-6 px-4 text-3xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
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
                                                className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${isTopThree ? (darkMode ? 'bg-yellow-900 bg-opacity-20' : 'bg-yellow-50') : ''}`}
                                            >
                                                <td className={`py-6 px-4 text-2xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                    {medalEmoji} {index + 1}
                                                </td>
                                                <td className={`py-6 px-4 text-2xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                    {player.name}
                                                </td>
                                                <td className="py-6 px-4 text-2xl text-center text-green-500 font-bold">
                                                    {player.wins}
                                                </td>
                                                <td className="py-6 px-4 text-2xl text-center text-red-500 font-bold">
                                                    {player.losses}
                                                </td>
                                                <td className={`py-6 px-4 text-2xl text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {player.gamesPlayed}
                                                </td>
                                                <td className={`py-6 px-4 text-2xl text-center font-bold ${
                                                    player.pointDifferential > 0 
                                                        ? 'text-green-500' 
                                                        : player.pointDifferential < 0 
                                                        ? 'text-red-500' 
                                                        : darkMode ? 'text-gray-400' : 'text-gray-600'
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

    // Don't render until network info is loaded to avoid showing wrong IP in QR code
    if (!networkInfo) {
        return (
            <div className={`h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-green-500 to-blue-600'}`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
                    <p className="text-white text-xl font-semibold">Loading...</p>
                </div>
            </div>
        );
    }

    // Determine the best URL to show for the QR code
    let displayUrl = window.location.origin;

    // Always prefer showing the network IP address if available
    if (networkInfo && networkInfo.ip) {
        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : '';
        displayUrl = `${protocol}//${networkInfo.ip}${port}`;
    }

    // Remove /spectator from the URL if present
    const baseUrl = displayUrl.replace(/\/spectator$/, '');

    return (
        <div className={`h-screen flex ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-green-500 to-blue-600'}`}>
            {/* Top Left - App URL QR Code only (no WiFi QR since user is already connected) */}
            <div className="fixed top-4 left-4 z-50">
                <div className={`rounded-xl shadow-2xl p-3 ${darkMode ? 'bg-gray-800 border-2 border-green-500' : 'bg-white border-2 border-green-400'}`}>
                    <div className="flex flex-col items-center">
                        <p className={`text-sm font-bold mb-1 text-center ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            Scan to Connect
                        </p>
                        <QRCode
                            value={baseUrl}
                            size={100}
                            level="M"
                        />
                        <p className={`text-xs mt-1 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Open app
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content - Courts and Bench */}
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="text-center mb-6 flex-shrink-0">
                    {hasActiveRound && round ? (
                        <>
                            <h1 className={`text-6xl font-bold mb-2 ${darkMode ? 'text-gray-200' : 'text-white'}`}>
                                Round {round.roundNumber}
                            </h1>
                            <p className={`text-3xl opacity-90 ${darkMode ? 'text-gray-300' : 'text-white'}`}>
                                Current Matchups
                            </p>
                        </>
                    ) : lastCompletedRound ? (
                        <>
                            <h1 className={`text-6xl font-bold mb-2 ${darkMode ? 'text-gray-200' : 'text-white'}`}>
                                Round {lastCompletedRound.roundNumber} Results
                            </h1>
                            <p className={`text-3xl opacity-90 ${darkMode ? 'text-gray-300' : 'text-white'}`}>
                                Start the next round to continue
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className={`text-6xl font-bold mb-2 ${darkMode ? 'text-gray-200' : 'text-white'}`}>
                                Waiting for Round
                            </h1>
                            <p className={`text-3xl opacity-90 ${darkMode ? 'text-gray-300' : 'text-white'}`}>
                                Start the next round to begin
                            </p>
                        </>
                    )}
                </div>

                {/* Courts Grid - Show active round or previous round results */}
                {hasActiveRound && round ? (
                    <>
                        <div className={`grid ${getGridCols(round.matches.length)} gap-6 mb-6 flex-1 min-h-0 overflow-auto`}>
                            {round.matches.map((match) => {
                                const team1Won = match.completed && match.team1Score! > match.team2Score!;
                                const team2Won = match.completed && match.team2Score! > match.team1Score!;
                                
                                return (
                                    <div
                                        key={match.id}
                                        className={`rounded-3xl shadow-2xl p-6 flex flex-col min-h-0 ${darkMode ? 'bg-gray-800' : 'bg-gradient-to-br from-amber-50 to-orange-100'}`}
                                    >
                                        <div className="text-center mb-4 flex-shrink-0">
                                            <h2 className={`font-bold ${getCourtTitleSize(round.matches.length)} ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                Court {match.courtNumber}
                                            </h2>
                                            <p className="text-lg font-semibold h-7">
                                                {match.completed && (
                                                    <span className={darkMode ? 'text-green-400' : 'text-green-600'}>Score Entered</span>
                                                )}
                                            </p>
                                        </div>

                                        <div className="space-y-4 flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24">
                                            {/* Team 1 */}
                                            <div className={`rounded-2xl p-6 flex items-center justify-between ${
                                                team1Won 
                                                    ? darkMode ? 'bg-green-900 border-4 border-green-500' : 'bg-green-200 border-4 border-green-600'
                                                    : darkMode ? 'bg-gray-700' : 'bg-cyan-200'
                                            }`}>
                                                <div className="flex-1">
                                                    <p className={`font-bold text-center break-words w-full ${getPlayerNameSize(round.matches.length)} ${
                                                        team1Won 
                                                            ? darkMode ? 'text-green-300' : 'text-gray-800'
                                                            : darkMode ? 'text-cyan-300' : 'text-gray-800'
                                                    }`}>
                                                        {match.team1.player1.name}
                                                    </p>
                                                    <p className={`font-bold text-center break-words w-full ${getPlayerNameSize(round.matches.length)} ${
                                                        team1Won 
                                                            ? darkMode ? 'text-green-300' : 'text-gray-800'
                                                            : darkMode ? 'text-cyan-300' : 'text-gray-800'
                                                    }`}>
                                                        {match.team1.player2.name}
                                                    </p>
                                                </div>
                                                {match.completed && (
                                                    <div className={`ml-4 flex-shrink-0 w-40 text-center font-bold ${getScoreSize(round.matches.length)} ${
                                                        team1Won ? 'text-green-400' : darkMode ? 'text-gray-400' : 'text-gray-700'
                                                    }`}>
                                                        {match.team1Score}
                                                    </div>
                                                )}
                                            </div>

                                            {/* VS Divider */}
                                            <div className="text-center flex-shrink-0">
                                                <span className={`font-bold ${getVsSize(round.matches.length)} ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>VS</span>
                                            </div>

                                            {/* Team 2 */}
                                            <div className={`rounded-2xl p-6 flex items-center justify-between ${
                                                team2Won 
                                                    ? darkMode ? 'bg-green-900 border-4 border-green-500' : 'bg-green-200 border-4 border-green-600'
                                                    : darkMode ? 'bg-gray-700' : 'bg-purple-200'
                                            }`}>
                                                <div className="flex-1">
                                                    <p className={`font-bold text-center break-words w-full ${getPlayerNameSize(round.matches.length)} ${
                                                        team2Won 
                                                            ? darkMode ? 'text-green-300' : 'text-gray-800'
                                                            : darkMode ? 'text-purple-300' : 'text-gray-800'
                                                    }`}>
                                                        {match.team2.player1.name}
                                                    </p>
                                                    <p className={`font-bold text-center break-words w-full ${getPlayerNameSize(round.matches.length)} ${
                                                        team2Won 
                                                            ? darkMode ? 'text-green-300' : 'text-gray-800'
                                                            : darkMode ? 'text-purple-300' : 'text-gray-800'
                                                    }`}>
                                                        {match.team2.player2.name}
                                                    </p>
                                                </div>
                                                {match.completed && (
                                                    <div className={`ml-4 flex-shrink-0 w-40 text-center font-bold ${getScoreSize(round.matches.length)} ${
                                                        team2Won ? 'text-green-400' : darkMode ? 'text-gray-400' : 'text-gray-700'
                                                    }`}>
                                                        {match.team2Score}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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
                                    className={`rounded-3xl shadow-2xl p-6 flex flex-col min-h-0 ${darkMode ? 'bg-gray-800' : 'bg-gradient-to-br from-amber-50 to-orange-100'}`}
                                >
                                    <div className="text-center mb-4 flex-shrink-0">
                                        <h2 className={`font-bold ${getCourtTitleSize(previousRoundHistory.length)} ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            Court {game.courtNumber}
                                        </h2>
                                        <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Final Score</p>
                                    </div>

                                    <div className="space-y-4 flex-1 flex flex-col justify-center px-24">
                                        {/* Team 1 */}
                                        <div className={`rounded-2xl p-6 flex items-center justify-between ${
                                            team1Won
                                                ? darkMode ? 'bg-green-900 border-4 border-green-500' : 'bg-green-200 border-4 border-green-600'
                                                : darkMode ? 'bg-gray-700' : 'bg-amber-100'
                                        }`}>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-center break-words ${getPlayerNameSize(previousRoundHistory.length)} ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                    {game.team1Players[0]}
                                                </p>
                                                <p className={`font-bold text-center break-words ${getPlayerNameSize(previousRoundHistory.length)} ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                    {game.team1Players[1]}
                                                </p>
                                            </div>
                                            <div className={`font-bold ml-4 flex-shrink-0 w-40 text-center ${getScoreSize(previousRoundHistory.length)} ${team1Won ? 'text-green-400' : darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                                                {game.team1Score}
                                            </div>
                                        </div>

                                        {/* Team 2 */}
                                        <div className={`rounded-2xl p-6 flex items-center justify-between ${
                                            team2Won
                                                ? darkMode ? 'bg-green-900 border-4 border-green-500' : 'bg-green-200 border-4 border-green-600'
                                                : darkMode ? 'bg-gray-700' : 'bg-amber-100'
                                        }`}>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-center break-words ${getPlayerNameSize(previousRoundHistory.length)} ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                    {game.team2Players[0]}
                                                </p>
                                                <p className={`font-bold text-center break-words ${getPlayerNameSize(previousRoundHistory.length)} ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                    {game.team2Players[1]}
                                                </p>
                                            </div>
                                            <div className={`font-bold ml-4 flex-shrink-0 w-40 text-center ${getScoreSize(previousRoundHistory.length)} ${team2Won ? 'text-green-400' : darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
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
                className={`w-80 xl:w-96 p-6 overflow-y-auto ${darkMode ? 'bg-gray-950 bg-opacity-95' : 'bg-gray-800 bg-opacity-90'}`}
                style={{ scrollBehavior: "auto" }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <h2 className={`text-3xl font-bold mb-6 text-center ${darkMode ? 'text-gray-200' : 'text-white'}`}>
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
                                className={`rounded-xl p-4 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-2xl font-bold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            #{index + 1}
                                        </span>
                                        <span className={`text-xl font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            {player.name}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className={`rounded-lg p-2 text-center ${darkMode ? 'bg-green-900' : 'bg-green-100'}`}>
                                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Wins</div>
                                        <div className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                            {player.wins}
                                        </div>
                                    </div>
                                    <div className={`rounded-lg p-2 text-center ${darkMode ? 'bg-red-900' : 'bg-red-100'}`}>
                                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Losses</div>
                                        <div className={`text-lg font-bold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                                            {player.losses}
                                        </div>
                                    </div>
                                    <div className={`rounded-lg p-2 text-center ${darkMode ? 'bg-orange-900' : 'bg-orange-100'}`}>
                                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sat</div>
                                        <div className={`text-lg font-bold ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                                            {player.roundsSatOut}
                                        </div>
                                    </div>
                                    <div className={`rounded-lg p-2 text-center ${darkMode ? 'bg-purple-900' : 'bg-purple-100'}`}>
                                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Diff</div>
                                        <div className={`text-lg font-bold ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
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

function getCourtTitleSize(numCourts: number): string {
    if (numCourts === 1) return "text-6xl xl:text-7xl 2xl:text-8xl";
    if (numCourts === 2) return "text-5xl xl:text-6xl";
    if (numCourts === 3) return "text-4xl xl:text-5xl";
    return "text-3xl xl:text-4xl";
}

function getPlayerNameSize(numCourts: number): string {
    if (numCourts === 1) return "text-4xl xl:text-5xl 2xl:text-6xl";
    if (numCourts === 2) return "text-3xl xl:text-4xl";
    if (numCourts === 3) return "text-2xl xl:text-3xl";
    return "text-xl xl:text-2xl";
}

function getVsSize(numCourts: number): string {
    if (numCourts === 1) return "text-5xl xl:text-6xl 2xl:text-7xl";
    if (numCourts === 2) return "text-4xl xl:text-5xl";
    if (numCourts === 3) return "text-3xl xl:text-4xl";
    return "text-2xl xl:text-3xl";
}

function getScoreSize(numCourts: number): string {
    if (numCourts === 1) return "text-7xl xl:text-8xl 2xl:text-9xl";
    if (numCourts === 2) return "text-6xl xl:text-7xl";
    if (numCourts === 3) return "text-5xl xl:text-6xl";
    return "text-4xl xl:text-5xl";
}
