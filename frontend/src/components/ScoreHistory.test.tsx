import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../test/utils";
import userEvent from "@testing-library/user-event";
import { ScoreHistory } from "./ScoreHistory";
import { GameHistory } from "../types/game";

const mockHistory: GameHistory[] = [
  {
    matchId: "match-1",
    roundNumber: 1,
    courtNumber: 1,
    team1Players: ["Alice", "Bob"],
    team2Players: ["Charlie", "Dave"],
    team1PlayerIds: ["alice-id", "bob-id"],
    team2PlayerIds: ["charlie-id", "dave-id"],
    team1Score: 11,
    team2Score: 9,
    timestamp: Date.now() - 3600000, // 1 hour ago
  },
  {
    matchId: "match-2",
    roundNumber: 1,
    courtNumber: 2,
    team1Players: ["Eve", "Frank"],
    team2Players: ["Grace", "Heidi"],
    team1PlayerIds: ["eve-id", "frank-id"],
    team2PlayerIds: ["grace-id", "heidi-id"],
    team1Score: 8,
    team2Score: 11,
    timestamp: Date.now() - 3500000,
  },
  {
    matchId: "match-3",
    roundNumber: 2,
    courtNumber: 1,
    team1Players: ["Alice", "Charlie"],
    team2Players: ["Bob", "Dave"],
    team1PlayerIds: ["alice-id", "charlie-id"],
    team2PlayerIds: ["bob-id", "dave-id"],
    team1Score: 11,
    team2Score: 7,
    timestamp: Date.now() - 1800000, // 30 mins ago
  },
];

describe("ScoreHistory", () => {
  const defaultProps = {
    history: mockHistory,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the title", () => {
      render(<ScoreHistory {...defaultProps} />);
      expect(screen.getByText("Game History")).toBeInTheDocument();
    });

    it("renders close button", () => {
      render(<ScoreHistory {...defaultProps} />);
      expect(screen.getByText("Close")).toBeInTheDocument();
    });

    it("renders all history entries", () => {
      render(<ScoreHistory {...defaultProps} />);

      expect(screen.getByText(/Round 1 - Court 1/)).toBeInTheDocument();
      expect(screen.getByText(/Round 1 - Court 2/)).toBeInTheDocument();
      expect(screen.getByText(/Round 2 - Court 1/)).toBeInTheDocument();
    });

    it("renders player names", () => {
      render(<ScoreHistory {...defaultProps} />);

      // Use getAllByText since names appear in multiple matches
      expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Charlie").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Dave").length).toBeGreaterThan(0);
    });

    it("renders scores", () => {
      render(<ScoreHistory {...defaultProps} />);

      // First match: 11-9
      expect(screen.getAllByText("11").length).toBeGreaterThan(0);
      expect(screen.getAllByText("9").length).toBeGreaterThan(0);
    });

    it("shows empty state when no history", () => {
      render(<ScoreHistory history={[]} onClose={vi.fn()} />);
      expect(screen.getByText("No games played yet")).toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    it("displays history in reverse chronological order (newest first)", () => {
      render(<ScoreHistory {...defaultProps} />);

      const roundHeaders = screen.getAllByText(/Round \d+ - Court \d+/);
      // Most recent (Round 2) should appear first
      expect(roundHeaders[0]).toHaveTextContent("Round 2");
    });
  });

  describe("Winner Highlighting", () => {
    it("highlights winning team with trophy", () => {
      render(<ScoreHistory {...defaultProps} />);

      // Team 1 won first match (11-9), should show Winners badge
      const winnerBadges = screen.getAllByText("🏆 Winners");
      expect(winnerBadges.length).toBeGreaterThan(0);
    });

    it("applies green styling to winning team", () => {
      render(<ScoreHistory {...defaultProps} />);

      // Check that winning scores are highlighted
      const greenScores = document.querySelectorAll(".text-green-600");
      expect(greenScores.length).toBeGreaterThan(0);
    });
  });

  describe("Interactions", () => {
    it("calls onClose when close button clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ScoreHistory history={mockHistory} onClose={onClose} />);

      await user.click(screen.getByText("Close"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Timestamp Display", () => {
    it("displays formatted timestamps", () => {
      render(<ScoreHistory {...defaultProps} />);

      // Check that dates are rendered (will be in local format)
      const dateElements = document.querySelectorAll(".text-gray-600");
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  describe("Team Display", () => {
    it("shows Team 1 and Team 2 labels", () => {
      render(<ScoreHistory {...defaultProps} />);

      expect(screen.getAllByText("Team 1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Team 2").length).toBeGreaterThan(0);
    });
  });
});
