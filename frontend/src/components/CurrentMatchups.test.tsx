import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../test/utils";
import userEvent from "@testing-library/user-event";
import { CurrentMatchups } from "./CurrentMatchups";
import { mockRound, mockCompletedRound, mockPlayers } from "../test/mocks/mockData";

describe("CurrentMatchups", () => {
  const mockProps = {
    round: mockRound,
    onEnterScores: vi.fn(),
    onViewHistory: vi.fn(),
    onCancelRound: vi.fn(),
    onStartNextRound: vi.fn(),
    onResetSession: vi.fn(),
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders round number", () => {
      render(<CurrentMatchups {...mockProps} />);
      expect(screen.getByText("Round 1")).toBeInTheDocument();
      expect(screen.getByText("Current Matchups")).toBeInTheDocument();
    });

    it("renders all matches with court numbers", () => {
      render(<CurrentMatchups {...mockProps} />);

      expect(screen.getByText("Court 1")).toBeInTheDocument();
      expect(screen.getByText("Court 2")).toBeInTheDocument();
    });

    it("renders team names for each match", () => {
      render(<CurrentMatchups {...mockProps} />);

      // Check that player names from mockRound are displayed
      expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
    });

    it("renders VS divider between teams", () => {
      render(<CurrentMatchups {...mockProps} />);

      const vsElements = screen.getAllByText("VS");
      expect(vsElements.length).toBe(mockRound.matches.length);
    });
  });

  describe("Match Completion States", () => {
    it('shows "Enter Scores" button when no scores entered', () => {
      render(<CurrentMatchups {...mockProps} />);

      expect(screen.getByText("Enter Scores")).toBeInTheDocument();
      expect(screen.queryByText("Start Next Round")).not.toBeInTheDocument();
    });

    it('shows "Edit Scores" button when some scores entered', () => {
      const roundWithPartialScores = {
        ...mockRound,
        matches: [
          { ...mockRound.matches[0], completed: true, team1Score: 11, team2Score: 9 },
          mockRound.matches[1], // Not completed
        ],
      };

      render(<CurrentMatchups {...mockProps} round={roundWithPartialScores} />);

      expect(screen.getByText("Edit Scores")).toBeInTheDocument();
    });

    it('shows "Start Next Round" button when all matches complete', () => {
      render(<CurrentMatchups {...mockProps} round={mockCompletedRound} />);

      expect(screen.getByText("Start Next Round")).toBeInTheDocument();
      expect(screen.queryByText("Enter Scores")).not.toBeInTheDocument();
    });

    it('displays "Score Entered" text for completed matches', () => {
      render(<CurrentMatchups {...mockProps} round={mockCompletedRound} />);

      expect(screen.getByText("Score Entered")).toBeInTheDocument();
    });
  });

  describe("Score Display", () => {
    it("shows scores for completed matches", () => {
      const roundWithScores = {
        ...mockRound,
        matches: [{ ...mockRound.matches[0], completed: true, team1Score: 11, team2Score: 9 }],
      };

      render(<CurrentMatchups {...mockProps} round={roundWithScores} />);

      expect(screen.getByText("11")).toBeInTheDocument();
      expect(screen.getByText("9")).toBeInTheDocument();
    });

    it("highlights winning team with green background", () => {
      const roundWithScores = {
        ...mockRound,
        matches: [{ ...mockRound.matches[0], completed: true, team1Score: 11, team2Score: 9 }],
      };

      const { container } = render(<CurrentMatchups {...mockProps} round={roundWithScores} />);

      // Winner should have green background
      const greenBackgrounds = container.querySelectorAll(".bg-green-200");
      expect(greenBackgrounds.length).toBeGreaterThan(0);
    });

    it("does not show scores for incomplete matches", () => {
      render(<CurrentMatchups {...mockProps} />);

      // mockRound has no completed matches
      expect(screen.queryByText("11")).not.toBeInTheDocument();
      expect(screen.queryByText("9")).not.toBeInTheDocument();
    });
  });

  describe("Bench Display", () => {
    it("shows benched players when present", () => {
      const roundWithBench = {
        ...mockRound,
        benchedPlayers: [mockPlayers[0], mockPlayers[1]],
      };

      render(<CurrentMatchups {...mockProps} round={roundWithBench} />);

      expect(screen.getByText("On the Bench")).toBeInTheDocument();
    });

    it("does not show bench section when no benched players", () => {
      render(<CurrentMatchups {...mockProps} />);

      expect(screen.queryByText("On the Bench")).not.toBeInTheDocument();
    });
  });

  describe("Action Buttons", () => {
    it("calls onEnterScores when Enter Scores clicked", async () => {
      const user = userEvent.setup();
      render(<CurrentMatchups {...mockProps} />);

      await user.click(screen.getByText("Enter Scores"));

      expect(mockProps.onEnterScores).toHaveBeenCalled();
    });

    it("calls onStartNextRound when Start Next Round clicked", async () => {
      const user = userEvent.setup();
      render(<CurrentMatchups {...mockProps} round={mockCompletedRound} />);

      await user.click(screen.getByText("Start Next Round"));

      expect(mockProps.onStartNextRound).toHaveBeenCalled();
    });

    it("calls onViewHistory when View History clicked", async () => {
      const user = userEvent.setup();
      render(<CurrentMatchups {...mockProps} />);

      await user.click(screen.getByText("View History"));

      expect(mockProps.onViewHistory).toHaveBeenCalled();
    });

    it("calls onCancelRound when Cancel Round clicked", async () => {
      const user = userEvent.setup();
      render(<CurrentMatchups {...mockProps} />);

      await user.click(screen.getByText("Cancel Round"));

      expect(mockProps.onCancelRound).toHaveBeenCalled();
    });

    it("calls onResetSession when Reset clicked", async () => {
      const user = userEvent.setup();
      render(<CurrentMatchups {...mockProps} />);

      const resetButtons = screen.getAllByText("Reset");
      if (resetButtons.length > 0) {
        await user.click(resetButtons[0]);
        expect(mockProps.onResetSession).toHaveBeenCalled();
      }
    });
  });

  describe("Loading State", () => {
    it("disables buttons when loading", () => {
      render(<CurrentMatchups {...mockProps} round={mockCompletedRound} loading={true} />);

      expect(screen.getByText("Starting...")).toBeDisabled();
      expect(screen.getByText("Cancel Round")).toBeDisabled();
      expect(screen.getByText("View History")).toBeDisabled();
    });

    it('shows "Starting..." text when loading', () => {
      render(<CurrentMatchups {...mockProps} round={mockCompletedRound} loading={true} />);

      expect(screen.getByText("Starting...")).toBeInTheDocument();
      expect(screen.queryByText("Start Next Round")).not.toBeInTheDocument();
    });

    it("enables buttons when not loading", () => {
      render(<CurrentMatchups {...mockProps} round={mockCompletedRound} loading={false} />);

      expect(screen.getByText("Start Next Round")).toBeEnabled();
      expect(screen.getByText("Cancel Round")).toBeEnabled();
      expect(screen.getByText("View History")).toBeEnabled();
    });
  });

  describe("Grid Layout", () => {
    it("handles single court layout", () => {
      const singleCourtRound = {
        ...mockRound,
        matches: [mockRound.matches[0]],
      };

      render(<CurrentMatchups {...mockProps} round={singleCourtRound} />);

      expect(screen.getByText("Court 1")).toBeInTheDocument();
      expect(screen.queryByText("Court 2")).not.toBeInTheDocument();
    });

    it("handles multiple courts layout", () => {
      const fourCourtRound = {
        ...mockRound,
        matches: [
          mockRound.matches[0],
          mockRound.matches[1],
          { ...mockRound.matches[0], id: "match-3", courtNumber: 3 },
          { ...mockRound.matches[0], id: "match-4", courtNumber: 4 },
        ],
      };

      render(<CurrentMatchups {...mockProps} round={fourCourtRound} />);

      expect(screen.getByText("Court 1")).toBeInTheDocument();
      expect(screen.getByText("Court 2")).toBeInTheDocument();
      expect(screen.getByText("Court 3")).toBeInTheDocument();
      expect(screen.getByText("Court 4")).toBeInTheDocument();
    });
  });
});
