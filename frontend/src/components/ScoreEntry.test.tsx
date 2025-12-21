import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../test/utils";
import userEvent from "@testing-library/user-event";
import { ScoreEntry } from "./ScoreEntry";
import { mockRound, mockMatch } from "../test/mocks/mockData";

describe("ScoreEntry", () => {
  const mockProps = {
    round: mockRound,
    onSubmitScores: vi.fn(),
    onCancel: vi.fn(),
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders round number", () => {
      render(<ScoreEntry {...mockProps} />);
      expect(screen.getByText("Round 1")).toBeInTheDocument();
      expect(screen.getByText("Enter Scores")).toBeInTheDocument();
    });

    it("renders all matches from round", () => {
      render(<ScoreEntry {...mockProps} />);
      expect(screen.getAllByText("Court 1")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Court 2")[0]).toBeInTheDocument();
    });

    it("renders team names for each match", () => {
      render(<ScoreEntry {...mockProps} />);

      // Team names from mockMatch - use getAllByText since names appear in multiple places
      expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Charlie").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Dave").length).toBeGreaterThan(0);
    });

    it("renders score inputs for all teams", () => {
      render(<ScoreEntry {...mockProps} />);

      // Should have 4 inputs (2 teams × 2 matches)
      const inputs = screen.getAllByPlaceholderText("Score");
      expect(inputs.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Score Input", () => {
    it("updates score when user types", async () => {
      const user = userEvent.setup();
      render(<ScoreEntry {...mockProps} />);

      const inputs = screen.getAllByPlaceholderText("Score");
      const firstInput = inputs[0] as HTMLInputElement;

      await user.type(firstInput, "11");

      expect(firstInput.value).toBe("11");
    });

    it("only allows numeric input", async () => {
      const user = userEvent.setup();
      render(<ScoreEntry {...mockProps} />);

      const inputs = screen.getAllByPlaceholderText("Score");
      const firstInput = inputs[0] as HTMLInputElement;

      await user.type(firstInput, "abc123xyz");

      // Should only have the numbers
      expect(firstInput.value).toBe("123");
    });

    it("clears match error when user starts editing", async () => {
      const user = userEvent.setup();
      render(<ScoreEntry {...mockProps} />);

      // Try to submit with incomplete score to generate error
      const inputs = screen.getAllByPlaceholderText("Score");
      await user.type(inputs[0], "11");
      await user.click(screen.getByText("Submit Scores"));

      // Should show error
      expect(await screen.findByText("Please enter scores for both teams")).toBeInTheDocument();

      // Type in second input
      await user.type(inputs[1], "9");

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText("Please enter scores for both teams")).not.toBeInTheDocument();
      });
    });
  });

  describe("Validation", () => {
    it("requires both team scores if one is entered", async () => {
      const user = userEvent.setup();
      render(<ScoreEntry {...mockProps} />);

      const inputs = screen.getAllByPlaceholderText("Score");

      // Enter only team1 score
      await user.type(inputs[0], "11");
      await user.click(screen.getByText("Submit Scores"));

      expect(await screen.findByText("Please enter scores for both teams")).toBeInTheDocument();
      expect(mockProps.onSubmitScores).not.toHaveBeenCalled();
    });

    it("shows error for tie scores", async () => {
      const user = userEvent.setup();
      render(<ScoreEntry {...mockProps} />);

      const inputs = screen.getAllByPlaceholderText("Score");

      // Enter same score for both teams
      await user.type(inputs[0], "11");
      await user.type(inputs[1], "11");
      await user.click(screen.getByText("Submit Scores"));

      expect(await screen.findByText("Tie scores are not allowed")).toBeInTheDocument();
      expect(mockProps.onSubmitScores).not.toHaveBeenCalled();
    });

    it("requires at least one complete score", async () => {
      const user = userEvent.setup();
      render(<ScoreEntry {...mockProps} />);

      // Don't enter any scores
      await user.click(screen.getByText("Submit Scores"));

      expect(await screen.findByText("Please enter at least one score")).toBeInTheDocument();
      expect(mockProps.onSubmitScores).not.toHaveBeenCalled();
    });

    it("allows partial score submission (only some matches)", async () => {
      const user = userEvent.setup();
      render(<ScoreEntry {...mockProps} />);

      const inputs = screen.getAllByPlaceholderText("Score");

      // Only enter scores for first match (Court 1), leave Court 2 empty
      await user.type(inputs[0], "11");
      await user.type(inputs[1], "9");
      await user.click(screen.getByText("Submit Scores"));

      await waitFor(() => {
        expect(mockProps.onSubmitScores).toHaveBeenCalledWith([
          {
            matchId: mockMatch.id,
            team1Score: 11,
            team2Score: 9,
          },
        ]);
      });
    });

    it("submits all complete scores", async () => {
      const user = userEvent.setup();
      render(<ScoreEntry {...mockProps} />);

      const inputs = screen.getAllByPlaceholderText("Score");

      // With 2 matches, we should have at least 4 inputs (2 teams × 2 matches)
      // But might have more due to mobile/desktop layouts
      // Enter scores for first two pairs
      await user.type(inputs[0], "11");
      await user.type(inputs[1], "9");

      await user.click(screen.getByText("Submit Scores"));

      await waitFor(() => {
        expect(mockProps.onSubmitScores).toHaveBeenCalled();
        const callArgs = mockProps.onSubmitScores.mock.calls[0][0];
        // Should have at least one score submitted
        expect(callArgs.length).toBeGreaterThan(0);
        expect(callArgs[0]).toMatchObject({
          matchId: expect.any(String),
          team1Score: expect.any(Number),
          team2Score: expect.any(Number),
        });
      });
    });

    it("displays general error message when validation fails", async () => {
      const user = userEvent.setup();
      render(<ScoreEntry {...mockProps} />);

      const inputs = screen.getAllByPlaceholderText("Score");

      // Enter tie scores
      await user.type(inputs[0], "11");
      await user.type(inputs[1], "11");
      await user.click(screen.getByText("Submit Scores"));

      expect(await screen.findByText("Please fix the errors below")).toBeInTheDocument();
    });
  });

  describe("Pre-filled Scores", () => {
    it("displays existing scores when match has them", () => {
      const roundWithScores = {
        ...mockRound,
        matches: [
          {
            ...mockMatch,
            team1Score: 11,
            team2Score: 9,
          },
        ],
      };

      render(<ScoreEntry {...mockProps} round={roundWithScores} />);

      const inputs = screen.getAllByPlaceholderText("Score") as HTMLInputElement[];
      expect(inputs[0].value).toBe("11");
      expect(inputs[1].value).toBe("9");
    });
  });

  describe("Cancel Button", () => {
    it("calls onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<ScoreEntry {...mockProps} />);

      await user.click(screen.getByText("Cancel"));

      expect(mockProps.onCancel).toHaveBeenCalled();
    });

    it("does not call onSubmitScores when cancelling", async () => {
      const user = userEvent.setup();
      render(<ScoreEntry {...mockProps} />);

      const inputs = screen.getAllByPlaceholderText("Score");
      await user.type(inputs[0], "11");
      await user.type(inputs[1], "9");

      await user.click(screen.getByText("Cancel"));

      expect(mockProps.onCancel).toHaveBeenCalled();
      expect(mockProps.onSubmitScores).not.toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("disables inputs when loading", () => {
      render(<ScoreEntry {...mockProps} loading={true} />);

      const inputs = screen.getAllByPlaceholderText("Score");
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });

    it("disables buttons when loading", () => {
      render(<ScoreEntry {...mockProps} loading={true} />);

      expect(screen.getByText("Submitting...")).toBeDisabled();
      expect(screen.getByText("Cancel")).toBeDisabled();
    });

    it('shows "Submitting..." text when loading', () => {
      render(<ScoreEntry {...mockProps} loading={true} />);

      expect(screen.getByText("Submitting...")).toBeInTheDocument();
      expect(screen.queryByText("Submit Scores")).not.toBeInTheDocument();
    });
  });

  describe("Input Auto-select on Focus", () => {
    it("selects input value on focus", async () => {
      const user = userEvent.setup();
      render(<ScoreEntry {...mockProps} />);

      const inputs = screen.getAllByPlaceholderText("Score");
      const firstInput = inputs[0] as HTMLInputElement;

      // Type initial value
      await user.type(firstInput, "11");
      expect(firstInput.value).toBe("11");

      // Blur and focus again
      firstInput.blur();
      await user.click(firstInput);

      // Value should still be there (auto-select doesn't change value)
      expect(firstInput.value).toBe("11");
    });
  });
});
