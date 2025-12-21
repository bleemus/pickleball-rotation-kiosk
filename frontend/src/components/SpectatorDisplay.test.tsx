import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SpectatorDisplay } from "./SpectatorDisplay";
import { Session, Player } from "../types/game";

// Declare global for TypeScript
declare const global: typeof globalThis;

// Mock react-qr-code
vi.mock("react-qr-code", () => ({
  default: ({ value }: { value: string }) => <div data-testid="qr-code">{value}</div>,
}));

// Mock config
vi.mock("../config", () => ({
  APP_NAME: "Pickleball Rotation",
  SPECTATOR_DARK_MODE: false,
}));

const mockPlayers: Player[] = [
  {
    id: "1",
    name: "Alice",
    gamesPlayed: 3,
    wins: 2,
    losses: 1,
    pointDifferential: 5,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: "2",
    name: "Bob",
    gamesPlayed: 3,
    wins: 1,
    losses: 2,
    pointDifferential: -3,
    roundsSatOut: 1,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: "3",
    name: "Charlie",
    gamesPlayed: 3,
    wins: 3,
    losses: 0,
    pointDifferential: 12,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
  {
    id: "4",
    name: "Dave",
    gamesPlayed: 3,
    wins: 0,
    losses: 3,
    pointDifferential: -8,
    roundsSatOut: 1,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  },
];

const mockSession: Session = {
  id: "session-123",
  players: mockPlayers,
  currentRound: {
    roundNumber: 2,
    matches: [
      {
        id: "match-1",
        courtNumber: 1,
        team1: { player1: mockPlayers[0], player2: mockPlayers[1] },
        team2: { player1: mockPlayers[2], player2: mockPlayers[3] },
        completed: false,
      },
    ],
    benchedPlayers: [],
    completed: false,
  },
  gameHistory: [],
  partnershipHistory: {},
  opponentHistory: {},
  numCourts: 1,
  createdAt: Date.now(),
};

const mockNetworkInfo = {
  hostname: "pickleball-kiosk",
  ip: "192.168.1.100",
  port: "3000",
  allIPs: [{ interface: "en0", ip: "192.168.1.100" }],
};

describe("SpectatorDisplay", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;

    // Mock fetch with proper URL handling
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;

      if (url.includes("/network-info")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockNetworkInfo),
        } as Response);
      }
      if (url.includes("/wifi-info")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ssid: "TestWifi", password: "password123" }),
        } as Response);
      }
      if (url.includes("/session/active")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSession),
        } as Response);
      }
      return Promise.reject(new Error("Unknown URL"));
    }) as typeof global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("Loading and Initial Render", () => {
    it("renders without crashing", async () => {
      render(<SpectatorDisplay apiUrl="http://localhost:3001/api" />);

      // Wait for initial fetch
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it("displays round number when session is active", async () => {
      render(<SpectatorDisplay apiUrl="http://localhost:3001/api" />);

      await waitFor(() => {
        expect(screen.getByText(/Round 2/)).toBeInTheDocument();
      });
    });

    it("displays court assignments", async () => {
      render(<SpectatorDisplay apiUrl="http://localhost:3001/api" />);

      await waitFor(() => {
        expect(screen.getByText(/Court 1/)).toBeInTheDocument();
      });
    });

    it("displays player names in matchups", async () => {
      render(<SpectatorDisplay apiUrl="http://localhost:3001/api" />);

      await waitFor(() => {
        // Names appear multiple times (in matchups and in player stats), use getAllByText
        expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Charlie").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Dave").length).toBeGreaterThan(0);
      });
    });

    it("renders QR code component", async () => {
      render(<SpectatorDisplay apiUrl="http://localhost:3001/api" />);

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeInTheDocument();
      });
    });
  });

  describe("No Active Session", () => {
    it("shows welcome screen when no active session", async () => {
      global.fetch = vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : (input as Request).url;

        if (url.includes("/network-info")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNetworkInfo),
          } as Response);
        }
        if (url.includes("/wifi-info")) {
          return Promise.resolve({ ok: false } as Response);
        }
        if (url.includes("/session/active")) {
          return Promise.resolve({
            ok: false,
            status: 404,
          } as Response);
        }
        return Promise.reject(new Error("Unknown URL"));
      }) as typeof global.fetch;

      render(<SpectatorDisplay apiUrl="http://localhost:3001/api" />);

      await waitFor(() => {
        // When no session, shows welcome screen with setup instructions
        expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
        expect(screen.getByText(/Setup Instructions/)).toBeInTheDocument();
      });
    });
  });

  describe("Ended Session", () => {
    it("displays session summary when session ended", async () => {
      const endedSession: Session = {
        ...mockSession,
        ended: true,
        currentRound: null,
      };

      global.fetch = vi.fn((input: RequestInfo | URL) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : (input as Request).url;

        if (url.includes("/network-info")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNetworkInfo),
          } as Response);
        }
        if (url.includes("/wifi-info")) {
          return Promise.resolve({ ok: false } as Response);
        }
        if (url.includes("/session/active")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(endedSession),
          } as Response);
        }
        return Promise.reject(new Error("Unknown URL"));
      }) as typeof global.fetch;

      render(<SpectatorDisplay apiUrl="http://localhost:3001/api" />);

      await waitFor(() => {
        // Should show session ended state
        expect(screen.getByText(/Final Rankings/i)).toBeInTheDocument();
      });
    });
  });
});
