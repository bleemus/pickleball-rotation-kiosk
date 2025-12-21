import { describe, it, expect } from "vitest";
import { render, screen } from "../test/utils";
import { PlayerStats } from "./PlayerStats";
import { Player } from "../types/game";

describe("PlayerStats", () => {
  const mockPlayers: Player[] = [
    {
      id: "1",
      name: "Alice",
      gamesPlayed: 5,
      wins: 4,
      losses: 1,
      pointDifferential: 12,
      roundsSatOut: 1,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
    {
      id: "2",
      name: "Bob",
      gamesPlayed: 5,
      wins: 3,
      losses: 2,
      pointDifferential: 5,
      roundsSatOut: 1,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
    {
      id: "3",
      name: "Charlie",
      gamesPlayed: 5,
      wins: 2,
      losses: 3,
      pointDifferential: -3,
      roundsSatOut: 2,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
  ];

  describe("Rendering", () => {
    it("renders player stats header", () => {
      render(<PlayerStats players={mockPlayers} />);

      expect(screen.getByText("Player Stats")).toBeInTheDocument();
    });

    it("renders all players", () => {
      render(<PlayerStats players={mockPlayers} />);

      mockPlayers.forEach((player) => {
        expect(screen.getByText(player.name)).toBeInTheDocument();
      });
    });

    it("displays player rank numbers", () => {
      render(<PlayerStats players={mockPlayers} />);

      expect(screen.getByText("#1")).toBeInTheDocument();
      expect(screen.getByText("#2")).toBeInTheDocument();
      expect(screen.getByText("#3")).toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    it("sorts players by wins descending", () => {
      render(<PlayerStats players={mockPlayers} />);

      const playerElements = screen
        .getAllByText(/^[A-Za-z]+$/)
        .filter((el) => ["Alice", "Bob", "Charlie"].includes(el.textContent || ""));

      const playerNames = playerElements.map((el) => el.textContent);
      expect(playerNames).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("uses point differential as tiebreaker", () => {
      const playersWithTies: Player[] = [
        {
          ...mockPlayers[0],
          name: "Player1",
          wins: 3,
          pointDifferential: 5,
        },
        {
          ...mockPlayers[1],
          name: "Player2",
          wins: 3,
          pointDifferential: 10,
        },
        {
          ...mockPlayers[2],
          name: "Player3",
          wins: 3,
          pointDifferential: 3,
        },
      ];

      render(<PlayerStats players={playersWithTies} />);

      const playerElements = screen
        .getAllByText(/^Player[123]$/)
        .filter((el) => ["Player1", "Player2", "Player3"].includes(el.textContent || ""));

      const playerNames = playerElements.map((el) => el.textContent);
      expect(playerNames).toEqual(["Player2", "Player1", "Player3"]);
    });

    it("uses name as final tiebreaker", () => {
      const playersWithSameStats: Player[] = [
        {
          ...mockPlayers[0],
          name: "Charlie",
          wins: 3,
          pointDifferential: 5,
        },
        {
          ...mockPlayers[1],
          name: "Alice",
          wins: 3,
          pointDifferential: 5,
        },
        {
          ...mockPlayers[2],
          name: "Bob",
          wins: 3,
          pointDifferential: 5,
        },
      ];

      render(<PlayerStats players={playersWithSameStats} />);

      const playerElements = screen.getAllByText(/^[A-Z][a-z]+$/);

      const playerNames = playerElements
        .map((el) => el.textContent)
        .filter((name) => ["Alice", "Bob", "Charlie"].includes(name || ""));

      expect(playerNames).toEqual(["Alice", "Bob", "Charlie"]);
    });
  });

  describe("Player Information Display", () => {
    it("shows player statistics", () => {
      const { container } = render(<PlayerStats players={mockPlayers} />);

      // Check that stats are displayed in the component
      expect(container.textContent).toContain("Alice");
      expect(container.textContent).toContain("4"); // wins
      expect(container.textContent).toContain("12"); // point diff
    });

    it("shows point differential with + for positive", () => {
      render(<PlayerStats players={mockPlayers} />);

      expect(screen.getByText("+12")).toBeInTheDocument();
      expect(screen.getByText("+5")).toBeInTheDocument();
    });

    it("shows point differential without + for negative", () => {
      render(<PlayerStats players={mockPlayers} />);

      expect(screen.getByText("-3")).toBeInTheDocument();
    });

    it("displays all players with their stats", () => {
      render(<PlayerStats players={mockPlayers} />);

      mockPlayers.forEach((player) => {
        expect(screen.getByText(player.name)).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles empty player list", () => {
      render(<PlayerStats players={[]} />);

      expect(screen.getByText("Player Stats")).toBeInTheDocument();
    });

    it("handles single player", () => {
      const singlePlayer = [mockPlayers[0]];

      render(<PlayerStats players={singlePlayer} />);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("#1")).toBeInTheDocument();
    });
  });
});
