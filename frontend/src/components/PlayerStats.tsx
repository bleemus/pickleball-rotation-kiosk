import { Player } from "../types/game";
import { useEffect, useRef, useState } from "react";

interface PlayerStatsProps {
  players: Player[];
}

export function PlayerStats({ players }: PlayerStatsProps) {
  // Sort players by wins (descending), then by point differential (descending), then by name
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDifferential !== a.pointDifferential)
      return b.pointDifferential - a.pointDifferential;
    return a.name.localeCompare(b.name);
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // Track window size for auto-scroll behavior
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-scroll effect (desktop only)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isDesktop) return;

    const SCROLL_SPEED = 2; // pixels per interval
    const INTERVAL_MS = 30; // milliseconds between scrolls
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
          container.scrollTop = Math.min(currentScroll + SCROLL_SPEED, maxScroll);

          // Check if we reached bottom
          if (container.scrollTop >= maxScroll - 1) {
            atBottom = true;
            pauseUntil = now + PAUSE_AT_BOTTOM;
          }
        } else if (atBottom && currentScroll > 0) {
          // Scroll up
          container.scrollTop = Math.max(currentScroll - SCROLL_SPEED, 0);

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
  }, [isHovering, isDesktop, players.length]);

  return (
    <div
      ref={scrollContainerRef}
      className="w-full lg:fixed lg:right-0 lg:top-0 lg:bottom-0 lg:w-80 xl:w-96 bg-white lg:border-l-2 lg:border-l-4 lg:border-gray-300 lg:shadow-2xl lg:overflow-y-auto"
      style={{ scrollBehavior: "auto" }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="p-3 lg:p-4">
        {/* Header */}
        <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-3">Player Stats</h2>

        {/* Player List */}
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => (
            <div key={player.id} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-bold text-gray-600">#{index + 1}</span>
                <span className="text-sm lg:text-base font-bold text-gray-800 truncate">
                  {player.name}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="bg-white rounded p-1.5">
                  <div className="text-[10px] text-gray-600">Record</div>
                  <div className="text-xs font-bold">
                    <span className="text-green-600">{player.wins}</span>
                    <span className="text-gray-400">-</span>
                    <span className="text-red-600">{player.losses}</span>
                  </div>
                </div>

                <div className="bg-white rounded p-1.5">
                  <div className="text-[10px] text-gray-600">Diff</div>
                  <div
                    className={`text-xs font-bold ${
                      player.pointDifferential > 0
                        ? "text-green-600"
                        : player.pointDifferential < 0
                          ? "text-red-600"
                          : "text-gray-800"
                    }`}
                  >
                    {player.pointDifferential > 0 ? "+" : ""}
                    {player.pointDifferential}
                  </div>
                </div>

                <div className="bg-white rounded p-1.5">
                  <div className="text-[10px] text-gray-600">Games</div>
                  <div className="text-xs font-bold text-gray-800">{player.gamesPlayed}</div>
                </div>

                <div className="bg-white rounded p-1.5">
                  <div className="text-[10px] text-gray-600">Sat Out</div>
                  <div className="text-xs font-bold text-gray-800">{player.roundsSatOut}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
