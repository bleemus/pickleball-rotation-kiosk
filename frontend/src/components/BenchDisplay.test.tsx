import { describe, it, expect } from "vitest";
import { render, screen } from "../test/utils";
import { BenchDisplay } from "./BenchDisplay";
import { Player } from "../types/game";

describe("BenchDisplay", () => {
  const benchedPlayers: Player[] = [
    {
      id: "1",
      name: "Alice",
      gamesPlayed: 2,
      wins: 1,
      losses: 1,
      pointDifferential: 0,
      roundsSatOut: 3,
      consecutiveRoundsSatOut: 1,
      forceSitOut: false,
    },
    {
      id: "2",
      name: "Bob",
      gamesPlayed: 1,
      wins: 0,
      losses: 1,
      pointDifferential: -5,
      roundsSatOut: 2,
      consecutiveRoundsSatOut: 1,
      forceSitOut: false,
    },
  ];

  describe("Rendering", () => {
    it("renders benched players", () => {
      render(<BenchDisplay players={benchedPlayers} />);

      expect(screen.getByText("On the Bench")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("displays rounds sat out for each player", () => {
      render(<BenchDisplay players={benchedPlayers} />);

      expect(screen.getByText("Sat out: 3")).toBeInTheDocument();
      expect(screen.getByText("Sat out: 2")).toBeInTheDocument();
    });

    it("renders nothing when no benched players", () => {
      const { container } = render(<BenchDisplay players={[]} />);

      expect(container.firstChild).toBeNull();
      expect(screen.queryByText("On the Bench")).not.toBeInTheDocument();
    });

    it("handles single benched player", () => {
      render(<BenchDisplay players={[benchedPlayers[0]]} />);

      expect(screen.getByText("On the Bench")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    });

    it("displays all players when multiple are benched", () => {
      const manyPlayers: Player[] = Array.from({ length: 4 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i + 1}`,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pointDifferential: 0,
        roundsSatOut: i + 1,
        consecutiveRoundsSatOut: 1,
        forceSitOut: false,
      }));

      render(<BenchDisplay players={manyPlayers} />);

      manyPlayers.forEach((player) => {
        expect(screen.getByText(player.name)).toBeInTheDocument();
        expect(screen.getByText(`Sat out: ${player.roundsSatOut}`)).toBeInTheDocument();
      });
    });
  });

  describe("Player Information", () => {
    it("shows correct sat out count for each player", () => {
      const players: Player[] = [
        {
          ...benchedPlayers[0],
          roundsSatOut: 0,
        },
        {
          ...benchedPlayers[1],
          roundsSatOut: 10,
        },
      ];

      render(<BenchDisplay players={players} />);

      expect(screen.getByText("Sat out: 0")).toBeInTheDocument();
      expect(screen.getByText("Sat out: 10")).toBeInTheDocument();
    });
  });
});
