import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../test/utils";
import userEvent from "@testing-library/user-event";
import { AdminControls } from "./AdminControls";
import { Player } from "../types/game";

const mockPlayers: Player[] = [
  {
    id: "1",
    name: "Alice",
    gamesPlayed: 5,
    wins: 3,
    losses: 2,
    pointDifferential: 10,
    roundsSatOut: 1,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: "2",
    name: "Bob",
    gamesPlayed: 5,
    wins: 2,
    losses: 3,
    pointDifferential: -5,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: "3",
    name: "Charlie",
    gamesPlayed: 4,
    wins: 4,
    losses: 0,
    pointDifferential: 20,
    roundsSatOut: 2,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: "4",
    name: "Dave",
    gamesPlayed: 4,
    wins: 1,
    losses: 3,
    pointDifferential: -8,
    roundsSatOut: 1,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
];

describe("AdminControls", () => {
  const defaultProps = {
    players: mockPlayers,
    onViewHistory: vi.fn(),
    onResetSession: vi.fn(),
    onStartNextRound: vi.fn(),
    canStartRound: true,
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders player stats section", () => {
      render(<AdminControls {...defaultProps} />);
      expect(screen.getByText("Player Stats")).toBeInTheDocument();
    });

    it("renders all player names with stats", () => {
      render(<AdminControls {...defaultProps} />);

      expect(screen.getByText(/Alice:/)).toBeInTheDocument();
      expect(screen.getByText(/Bob:/)).toBeInTheDocument();
      expect(screen.getByText(/Charlie:/)).toBeInTheDocument();
      expect(screen.getByText(/Dave:/)).toBeInTheDocument();
    });

    it("displays wins and losses for each player", () => {
      render(<AdminControls {...defaultProps} />);

      // Alice: 3W-2L
      expect(screen.getByText("3W")).toBeInTheDocument();
      expect(screen.getByText("2L")).toBeInTheDocument();
    });

    it("renders View History button", () => {
      render(<AdminControls {...defaultProps} />);
      expect(screen.getByText("View History")).toBeInTheDocument();
    });

    it("renders Next Round button when canStartRound is true", () => {
      render(<AdminControls {...defaultProps} canStartRound={true} />);
      expect(screen.getByText("Next Round")).toBeInTheDocument();
    });

    it("renders Reset Session button when canStartRound is false", () => {
      render(<AdminControls {...defaultProps} canStartRound={false} />);
      expect(screen.getByText("Reset Session")).toBeInTheDocument();
    });

    it("does not render Next Round button when canStartRound is false", () => {
      render(<AdminControls {...defaultProps} canStartRound={false} />);
      expect(screen.queryByText("Next Round")).not.toBeInTheDocument();
    });

    it("does not render Reset Session button when canStartRound is true", () => {
      render(<AdminControls {...defaultProps} canStartRound={true} />);
      expect(screen.queryByText("Reset Session")).not.toBeInTheDocument();
    });
  });

  describe("Button Interactions", () => {
    it("calls onViewHistory when View History clicked", async () => {
      const user = userEvent.setup();
      render(<AdminControls {...defaultProps} />);

      await user.click(screen.getByText("View History"));

      expect(defaultProps.onViewHistory).toHaveBeenCalledTimes(1);
    });

    it("calls onStartNextRound when Next Round clicked", async () => {
      const user = userEvent.setup();
      render(<AdminControls {...defaultProps} canStartRound={true} />);

      await user.click(screen.getByText("Next Round"));

      expect(defaultProps.onStartNextRound).toHaveBeenCalledTimes(1);
    });

    it("calls onResetSession when Reset Session clicked", async () => {
      const user = userEvent.setup();
      render(<AdminControls {...defaultProps} canStartRound={false} />);

      await user.click(screen.getByText("Reset Session"));

      expect(defaultProps.onResetSession).toHaveBeenCalledTimes(1);
    });
  });

  describe("Loading State", () => {
    it("disables View History button when loading", () => {
      render(<AdminControls {...defaultProps} loading={true} />);
      expect(screen.getByText("View History")).toBeDisabled();
    });

    it("disables Next Round button when loading", () => {
      render(<AdminControls {...defaultProps} loading={true} canStartRound={true} />);
      expect(screen.getByText("Starting...")).toBeDisabled();
    });

    it('shows "Starting..." text when loading', () => {
      render(<AdminControls {...defaultProps} loading={true} canStartRound={true} />);
      expect(screen.getByText("Starting...")).toBeInTheDocument();
    });

    it("disables Reset Session button when loading", () => {
      render(<AdminControls {...defaultProps} loading={true} canStartRound={false} />);
      expect(screen.getByText("Reset Session")).toBeDisabled();
    });
  });

  describe("Empty Players", () => {
    it("renders with no players", () => {
      render(<AdminControls {...defaultProps} players={[]} />);
      expect(screen.getByText("Player Stats")).toBeInTheDocument();
    });
  });
});
