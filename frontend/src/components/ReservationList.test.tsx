import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../test/utils";
import userEvent from "@testing-library/user-event";
import { ReservationList } from "./ReservationList";
import { Reservation } from "../types/game";

describe("ReservationList", () => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const mockTodayReservation: Reservation = {
    id: "res-1",
    date: todayStr,
    startTime: "10:00am",
    endTime: "12:00pm",
    court: "Court 1",
    players: ["Alice", "Bob", "Charlie", "Dave"],
    createdAt: today.toISOString(),
    rawEmail: "test email content",
    organizer: "Alice",
  };

  const mockYesterdayReservation: Reservation = {
    id: "res-2",
    date: yesterdayStr,
    startTime: "2:00pm",
    endTime: "4:00pm",
    court: "Court 2",
    players: ["Eve", "Frank"],
    createdAt: yesterday.toISOString(),
    rawEmail: "test email content",
    organizer: "Eve",
  };

  const mockProps = {
    reservations: [],
    loading: false,
    error: null,
    onAddPlayers: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State", () => {
    it("renders loading message when loading", () => {
      render(<ReservationList {...mockProps} loading={true} />);

      expect(screen.getByText("Email Reservations")).toBeInTheDocument();
      expect(screen.getByText("Loading reservations...")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("renders error message when there is an error", () => {
      render(<ReservationList {...mockProps} error="Network error" />);

      expect(screen.getByText("Email Reservations")).toBeInTheDocument();
      expect(screen.getByText("Unable to load reservations from email parser")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("renders empty state when no reservations", () => {
      render(<ReservationList {...mockProps} reservations={[]} />);

      expect(screen.getByText("Email Reservations")).toBeInTheDocument();
      expect(screen.getByText("No reservations found in recent emails")).toBeInTheDocument();
    });
  });

  describe("With Reservations", () => {
    it("renders today's reservations", () => {
      render(<ReservationList {...mockProps} reservations={[mockTodayReservation]} />);

      expect(screen.getByText("Today's Reservations from Email")).toBeInTheDocument();
      expect(screen.getByText("Court 1 • 10:00am - 12:00pm")).toBeInTheDocument();
      expect(screen.getByText(/Alice, Bob, Charlie, Dave/)).toBeInTheDocument();
      expect(screen.getByText("Add Players")).toBeInTheDocument();
    });

    it("shows 'not today' label for past reservations when no today reservations", () => {
      render(<ReservationList {...mockProps} reservations={[mockYesterdayReservation]} />);

      expect(screen.getByText(/\(not today\)/)).toBeInTheDocument();
      expect(
        screen.getByText("No reservations for today. Showing all recent reservations:")
      ).toBeInTheDocument();
    });

    it("prioritizes today's reservations over past ones", () => {
      render(
        <ReservationList
          {...mockProps}
          reservations={[mockYesterdayReservation, mockTodayReservation]}
        />
      );

      // Today's reservation should be shown
      expect(screen.getByText(/Alice, Bob, Charlie, Dave/)).toBeInTheDocument();
      // Yesterday's shouldn't be visible (it's filtered out)
      expect(screen.queryByText(/Eve, Frank/)).not.toBeInTheDocument();
    });

    it("limits to 3 reservations when showing non-today reservations", () => {
      const manyReservations = [
        { ...mockYesterdayReservation, id: "res-1", players: ["Player1"] },
        { ...mockYesterdayReservation, id: "res-2", players: ["Player2"] },
        { ...mockYesterdayReservation, id: "res-3", players: ["Player3"] },
        { ...mockYesterdayReservation, id: "res-4", players: ["Player4"] },
      ];

      render(<ReservationList {...mockProps} reservations={manyReservations} />);

      expect(screen.getByText("Showing 3 of 4 recent reservations")).toBeInTheDocument();
    });
  });

  describe("Add Players Button", () => {
    it("calls onAddPlayers with reservation players when clicked", async () => {
      const user = userEvent.setup();
      render(<ReservationList {...mockProps} reservations={[mockTodayReservation]} />);

      await user.click(screen.getByText("Add Players"));

      expect(mockProps.onAddPlayers).toHaveBeenCalledWith(["Alice", "Bob", "Charlie", "Dave"]);
    });

    it("each reservation has its own Add Players button", async () => {
      const user = userEvent.setup();
      const twoTodayReservations = [
        mockTodayReservation,
        { ...mockTodayReservation, id: "res-3", players: ["X", "Y", "Z"] },
      ];

      render(<ReservationList {...mockProps} reservations={twoTodayReservations} />);

      const buttons = screen.getAllByText("Add Players");
      expect(buttons).toHaveLength(2);

      await user.click(buttons[1]);
      expect(mockProps.onAddPlayers).toHaveBeenCalledWith(["X", "Y", "Z"]);
    });
  });

  describe("Date Formatting", () => {
    it("formats reservation date correctly", () => {
      render(<ReservationList {...mockProps} reservations={[mockTodayReservation]} />);

      // Should show day of week, month, and day
      const dateElement = screen.getByText(/\w{3}, \w{3} \d+/);
      expect(dateElement).toBeInTheDocument();
    });
  });
});
