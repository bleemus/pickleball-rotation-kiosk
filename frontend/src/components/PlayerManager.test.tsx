import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../test/utils";
import userEvent from "@testing-library/user-event";
import { PlayerManager } from "./PlayerManager";
import { mockPlayers } from "../test/mocks/mockData";

// Mock window.confirm
const mockConfirm = vi.fn();
window.confirm = mockConfirm;

describe("PlayerManager", () => {
  const defaultProps = {
    players: mockPlayers.slice(0, 8),
    numCourts: 2,
    sessionId: "test-session",
    onAddPlayer: vi.fn(),
    onRemovePlayer: vi.fn(),
    onToggleSitOut: vi.fn(),
    onUpdateNumCourts: vi.fn(),
    onStartNextRound: vi.fn(),
    onViewHistory: vi.fn(),
    onEditPreviousScores: vi.fn(),
    onResetSession: vi.fn(),
    onEndSession: vi.fn(),
    hasCompletedRound: false,
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

  describe("Rendering", () => {
    it("renders the title", () => {
      render(<PlayerManager {...defaultProps} />);
      expect(screen.getByText("Manage Players")).toBeInTheDocument();
    });

    it("renders all players", () => {
      render(<PlayerManager {...defaultProps} />);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Charlie")).toBeInTheDocument();
      expect(screen.getByText("Dave")).toBeInTheDocument();
    });

    it("shows player count", () => {
      render(<PlayerManager {...defaultProps} />);
      expect(screen.getByText(/Current Players \(8\)/)).toBeInTheDocument();
    });

    it("shows active and sitting counts", () => {
      const playersWithSitOut = mockPlayers.slice(0, 8).map((p, i) => ({
        ...p,
        forceSitOut: i < 2, // 2 sitting out
      }));

      render(<PlayerManager {...defaultProps} players={playersWithSitOut} />);
      expect(screen.getByText(/6 Active/)).toBeInTheDocument();
      expect(screen.getByText(/2 Sitting/)).toBeInTheDocument();
    });

    it("shows empty state when no players", () => {
      render(<PlayerManager {...defaultProps} players={[]} />);
      expect(screen.getByText("No players in session")).toBeInTheDocument();
    });

    it("shows player stats (wins, losses, games)", () => {
      const playersWithStats = [
        {
          ...mockPlayers[0],
          wins: 5,
          losses: 3,
          gamesPlayed: 8,
        },
      ];

      render(<PlayerManager {...defaultProps} players={playersWithStats} />);
      expect(screen.getByText("5W - 3L • 8 games")).toBeInTheDocument();
    });
  });

  describe("Add Player Form", () => {
    it("renders add player input and button", () => {
      render(<PlayerManager {...defaultProps} />);

      expect(screen.getByPlaceholderText("Enter player name")).toBeInTheDocument();
      expect(screen.getByText("Add Player")).toBeInTheDocument();
    });

    it("calls onAddPlayer when form is submitted", async () => {
      const user = userEvent.setup();
      render(<PlayerManager {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter player name");
      await user.type(input, "NewPlayer");
      await user.click(screen.getByText("Add Player"));

      expect(defaultProps.onAddPlayer).toHaveBeenCalledWith("NewPlayer");
    });

    it("clears input after adding player", async () => {
      const user = userEvent.setup();
      render(<PlayerManager {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter player name") as HTMLInputElement;
      await user.type(input, "NewPlayer");
      await user.click(screen.getByText("Add Player"));

      expect(input.value).toBe("");
    });

    it("shows error for empty name", async () => {
      const user = userEvent.setup();
      render(<PlayerManager {...defaultProps} />);

      await user.click(screen.getByText("Add Player"));

      expect(screen.getByText("Please enter a player name")).toBeInTheDocument();
      expect(defaultProps.onAddPlayer).not.toHaveBeenCalled();
    });

    it("limits input to 30 characters via maxLength", () => {
      render(<PlayerManager {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter player name");
      expect(input).toHaveAttribute("maxLength", "30");
    });

    it("shows error for duplicate name", async () => {
      const user = userEvent.setup();
      render(<PlayerManager {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter player name");
      await user.type(input, "Alice"); // Already exists
      await user.click(screen.getByText("Add Player"));

      expect(screen.getByText("Player name already exists")).toBeInTheDocument();
      expect(defaultProps.onAddPlayer).not.toHaveBeenCalled();
    });

    it("duplicate check is case-insensitive", async () => {
      const user = userEvent.setup();
      render(<PlayerManager {...defaultProps} />);

      const input = screen.getByPlaceholderText("Enter player name");
      await user.type(input, "ALICE"); // Different case
      await user.click(screen.getByText("Add Player"));

      expect(screen.getByText("Player name already exists")).toBeInTheDocument();
    });
  });

  describe("Remove Player", () => {
    it("shows remove button for each player", () => {
      render(<PlayerManager {...defaultProps} />);

      const removeButtons = screen.getAllByTitle("Remove player");
      expect(removeButtons.length).toBe(8);
    });

    it("shows confirmation dialog when removing player", async () => {
      const user = userEvent.setup();
      render(<PlayerManager {...defaultProps} />);

      const removeButtons = screen.getAllByTitle("Remove player");
      await user.click(removeButtons[0]);

      expect(mockConfirm).toHaveBeenCalledWith(
        "Are you sure you want to remove Alice from the session?"
      );
    });

    it("calls onRemovePlayer when confirmed", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(true);
      render(<PlayerManager {...defaultProps} />);

      const removeButtons = screen.getAllByTitle("Remove player");
      await user.click(removeButtons[0]);

      expect(defaultProps.onRemovePlayer).toHaveBeenCalledWith("player-1");
    });

    it("does not call onRemovePlayer when cancelled", async () => {
      const user = userEvent.setup();
      mockConfirm.mockReturnValue(false);
      render(<PlayerManager {...defaultProps} />);

      const removeButtons = screen.getAllByTitle("Remove player");
      await user.click(removeButtons[0]);

      expect(defaultProps.onRemovePlayer).not.toHaveBeenCalled();
    });
  });

  describe("Toggle Sit Out", () => {
    it("shows sit/play button for each player", () => {
      render(<PlayerManager {...defaultProps} />);

      const sitButtons = screen.getAllByText("Sit");
      expect(sitButtons.length).toBe(8);
    });

    it('shows "Play" button for players marked as sitting out', () => {
      const playersWithSitOut = mockPlayers.slice(0, 8).map((p, i) => ({
        ...p,
        forceSitOut: i === 0, // First player sitting out
      }));

      render(<PlayerManager {...defaultProps} players={playersWithSitOut} />);

      expect(screen.getByText("Play")).toBeInTheDocument();
      expect(screen.getAllByText("Sit").length).toBe(7);
    });

    it("calls onToggleSitOut when clicked", async () => {
      const user = userEvent.setup();
      render(<PlayerManager {...defaultProps} />);

      const sitButtons = screen.getAllByText("Sit");
      await user.click(sitButtons[0]);

      expect(defaultProps.onToggleSitOut).toHaveBeenCalledWith("player-1");
    });

    it('shows "(Sitting Out)" label for players marked to sit', () => {
      const playersWithSitOut = [
        {
          ...mockPlayers[0],
          forceSitOut: true,
        },
      ];

      render(<PlayerManager {...defaultProps} players={playersWithSitOut} />);
      expect(screen.getByText("(Sitting Out)")).toBeInTheDocument();
    });
  });

  describe("Start Next Round Button", () => {
    it("renders start next round button", () => {
      render(<PlayerManager {...defaultProps} />);
      expect(screen.getByText("Start Next Round")).toBeInTheDocument();
    });

    it("calls onStartNextRound when clicked", async () => {
      const user = userEvent.setup();
      render(<PlayerManager {...defaultProps} />);

      await user.click(screen.getByText("Start Next Round"));

      expect(defaultProps.onStartNextRound).toHaveBeenCalled();
    });

    it("is disabled when not enough active players", () => {
      const fewPlayers = mockPlayers.slice(0, 4); // Only 4 players for 2 courts
      render(<PlayerManager {...defaultProps} players={fewPlayers} />);

      const button = screen.getByText("Start Next Round");
      expect(button).toBeDisabled();
    });

    it("shows warning when not enough players", () => {
      const fewPlayers = mockPlayers.slice(0, 4);
      render(<PlayerManager {...defaultProps} players={fewPlayers} />);

      expect(screen.getByText(/Need at least 8 active players/)).toBeInTheDocument();
    });

    it("is disabled when too many players are sitting out", () => {
      const playersWithSitOut = mockPlayers.slice(0, 8).map((p, i) => ({
        ...p,
        forceSitOut: i < 5, // 5 sitting out, only 3 active
      }));

      render(<PlayerManager {...defaultProps} players={playersWithSitOut} />);

      const button = screen.getByText("Start Next Round");
      expect(button).toBeDisabled();
    });

    it('shows "Starting..." when loading', () => {
      render(<PlayerManager {...defaultProps} loading={true} />);
      expect(screen.getByText("Starting...")).toBeInTheDocument();
    });
  });

  describe("End Session Button", () => {
    it("renders end session button", () => {
      render(<PlayerManager {...defaultProps} />);
      expect(screen.getByText("End Session & View Final Rankings")).toBeInTheDocument();
    });

    it("calls onEndSession when clicked", async () => {
      const user = userEvent.setup();
      render(<PlayerManager {...defaultProps} />);

      await user.click(screen.getByText("End Session & View Final Rankings"));

      expect(defaultProps.onEndSession).toHaveBeenCalled();
    });
  });

  describe("Action Buttons", () => {
    it("renders View History button", async () => {
      const user = userEvent.setup();
      render(<PlayerManager {...defaultProps} />);

      const button = screen.getByText("View History");
      await user.click(button);

      expect(defaultProps.onViewHistory).toHaveBeenCalled();
    });

    it("renders Edit Previous Scores button", () => {
      render(<PlayerManager {...defaultProps} hasCompletedRound={true} />);

      const button = screen.getByText("Edit Previous Scores");
      expect(button).not.toBeDisabled();
    });

    it("disables Edit Previous Scores when no completed round", () => {
      render(<PlayerManager {...defaultProps} hasCompletedRound={false} />);

      const button = screen.getByText("Edit Previous Scores");
      expect(button).toBeDisabled();
    });

    it("calls onEditPreviousScores when clicked", async () => {
      const user = userEvent.setup();
      render(<PlayerManager {...defaultProps} hasCompletedRound={true} />);

      await user.click(screen.getByText("Edit Previous Scores"));

      expect(defaultProps.onEditPreviousScores).toHaveBeenCalled();
    });
  });

  describe("Court Selector", () => {
    it("shows Change Courts button", () => {
      render(<PlayerManager {...defaultProps} />);

      // Mobile version
      expect(screen.getAllByText("Change Courts").length).toBeGreaterThan(0);
    });

    it("toggles court selector visibility", async () => {
      const user = userEvent.setup();
      render(<PlayerManager {...defaultProps} />);

      // Click to show
      const buttons = screen.getAllByText("Change Courts");
      await user.click(buttons[0]);

      expect(screen.getByText("Number of Courts")).toBeInTheDocument();

      // Click to hide
      await user.click(screen.getAllByText("Hide Courts")[0]);

      await waitFor(() => {
        expect(screen.queryByText("Number of Courts")).not.toBeInTheDocument();
      });
    });
  });

  describe("Warning Messages", () => {
    it("shows warning when not enough total players", () => {
      const fewPlayers = mockPlayers.slice(0, 6);
      render(<PlayerManager {...defaultProps} players={fewPlayers} numCourts={2} />);

      expect(screen.getByText(/Need at least 8 players/)).toBeInTheDocument();
    });

    it("shows error when too many players sitting out", () => {
      const playersWithSitOut = mockPlayers.slice(0, 8).map((p, i) => ({
        ...p,
        forceSitOut: i < 5,
      }));

      render(<PlayerManager {...defaultProps} players={playersWithSitOut} />);

      expect(screen.getByText(/Not enough players available/)).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("disables all buttons when loading", () => {
      render(<PlayerManager {...defaultProps} loading={true} />);

      expect(screen.getByText("Starting...")).toBeDisabled();
      expect(screen.getByText("End Session & View Final Rankings")).toBeDisabled();
      expect(screen.getByText("View History")).toBeDisabled();
      expect(screen.getByText("Add Player")).toBeDisabled();
    });

    it("disables input when loading", () => {
      render(<PlayerManager {...defaultProps} loading={true} />);

      const input = screen.getByPlaceholderText("Enter player name");
      expect(input).toBeDisabled();
    });
  });
});
