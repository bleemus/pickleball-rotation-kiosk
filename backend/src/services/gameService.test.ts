import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSession,
  getSessionById,
  addPlayer,
  removePlayer,
  togglePlayerSitOut,
  startNextRound,
  cancelCurrentRound,
  completeCurrentRound,
  updateNumCourts,
  endSession,
} from "./gameService";
import * as redis from "./redis";
import { Session, Player } from "../types/game";

// Mock redis module
vi.mock("./redis", () => ({
  saveSession: vi.fn(),
  getSession: vi.fn(),
  deleteSession: vi.fn(),
  getActiveSessionId: vi.fn(),
  setActiveSession: vi.fn(),
  updateSessionAtomic: vi.fn(),
}));

// Helper to create mock session
function createMockSession(overrides: Partial<Session> = {}): Session {
  const players: Player[] = Array.from({ length: 8 }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Player${i + 1}`,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    pointDifferential: 0,
    roundsSatOut: 0,
    consecutiveRoundsSatOut: 0,
    forceSitOut: false,
  }));

  return {
    id: "test-session-id",
    players,
    currentRound: null,
    gameHistory: [],
    partnershipHistory: {},
    opponentHistory: {},
    numCourts: 2,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("gameService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSession", () => {
    it("creates a session with valid player names", async () => {
      vi.mocked(redis.saveSession).mockResolvedValue();
      vi.mocked(redis.setActiveSession).mockResolvedValue();

      const playerNames = ["Alice", "Bob", "Charlie", "Dave", "Eve", "Frank", "Grace", "Heidi"];
      const result = await createSession({ playerNames, numCourts: 2 });

      expect(result.players).toHaveLength(8);
      expect(result.players[0].name).toBe("Alice");
      expect(result.numCourts).toBe(2);
      expect(redis.saveSession).toHaveBeenCalled();
      expect(redis.setActiveSession).toHaveBeenCalled();
    });

    it("throws error if not enough players for courts", async () => {
      const playerNames = ["Alice", "Bob", "Charlie", "Dave"];

      await expect(createSession({ playerNames, numCourts: 2 })).rejects.toThrow(
        "Need at least 8 players for 2 courts"
      );
    });

    it("throws error for empty player name", async () => {
      const playerNames = ["Alice", "", "Charlie", "Dave"];

      await expect(createSession({ playerNames, numCourts: 1 })).rejects.toThrow(
        "Player name cannot be empty"
      );
    });

    it("throws error for player name over 30 characters", async () => {
      const playerNames = ["A".repeat(31), "Bob", "Charlie", "Dave"];

      await expect(createSession({ playerNames, numCourts: 1 })).rejects.toThrow(
        "Player name must be 30 characters or less"
      );
    });

    it("throws error for player name with invalid characters", async () => {
      const playerNames = ['<script>alert("xss")</script>', "Bob", "Charlie", "Dave"];

      await expect(createSession({ playerNames, numCourts: 1 })).rejects.toThrow(
        "Player name contains invalid characters"
      );
    });

    it("trims whitespace from player names", async () => {
      vi.mocked(redis.saveSession).mockResolvedValue();
      vi.mocked(redis.setActiveSession).mockResolvedValue();

      const playerNames = ["  Alice  ", "Bob", "Charlie", "Dave"];
      const result = await createSession({ playerNames, numCourts: 1 });

      expect(result.players[0].name).toBe("Alice");
    });

    it("defaults to 2 courts if not specified", async () => {
      vi.mocked(redis.saveSession).mockResolvedValue();
      vi.mocked(redis.setActiveSession).mockResolvedValue();

      const playerNames = Array.from({ length: 8 }, (_, i) => `Player${i + 1}`);
      const result = await createSession({ playerNames });

      expect(result.numCourts).toBe(2);
    });
  });

  describe("getSessionById", () => {
    it("returns session when found", async () => {
      const mockSession = createMockSession();
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);

      const result = await getSessionById("test-session-id");

      expect(result).toEqual(mockSession);
    });

    it("throws error when session not found", async () => {
      vi.mocked(redis.getSession).mockResolvedValue(null);

      await expect(getSessionById("nonexistent")).rejects.toThrow("Session nonexistent not found");
    });
  });

  describe("addPlayer", () => {
    it("adds a new player to session", async () => {
      const mockSession = createMockSession();
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await addPlayer("test-session-id", { name: "NewPlayer" });

      expect(result.players).toHaveLength(9);
      expect(result.players[8].name).toBe("NewPlayer");
    });

    it("throws error for duplicate player name", async () => {
      const mockSession = createMockSession();
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);

      await expect(addPlayer("test-session-id", { name: "Player1" })).rejects.toThrow(
        "Player Player1 already exists in this session"
      );
    });

    it("duplicate check is case-insensitive", async () => {
      const mockSession = createMockSession();
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);

      await expect(addPlayer("test-session-id", { name: "PLAYER1" })).rejects.toThrow(
        "Player PLAYER1 already exists in this session"
      );
    });
  });

  describe("removePlayer", () => {
    it("removes a player from session", async () => {
      const mockSession = createMockSession();
      // Add an extra player so we have 9 players (above minimum of 8 for 2 courts)
      mockSession.players.push({
        id: "player-9",
        name: "Player9",
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pointDifferential: 0,
        roundsSatOut: 0,
        consecutiveRoundsSatOut: 0,
        forceSitOut: false,
      });
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await removePlayer("test-session-id", "player-1");

      expect(result.players).toHaveLength(8);
      expect(result.players.find((p) => p.id === "player-1")).toBeUndefined();
    });

    it("throws error if player is in current active round", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [
            {
              id: "match-1",
              courtNumber: 1,
              team1: {
                player1: { id: "player-1", name: "Player1" } as Player,
                player2: { id: "player-2", name: "Player2" } as Player,
              },
              team2: {
                player1: { id: "player-3", name: "Player3" } as Player,
                player2: { id: "player-4", name: "Player4" } as Player,
              },
              completed: false,
            },
          ],
          benchedPlayers: [],
          completed: false,
        },
      });
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);

      await expect(removePlayer("test-session-id", "player-1")).rejects.toThrow(
        "Cannot remove player who is in the current active round"
      );
    });

    it("throws error if removal would drop below minimum players", async () => {
      const mockSession = createMockSession();
      mockSession.players = mockSession.players.slice(0, 8); // Exactly 8 players for 2 courts
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);

      await expect(removePlayer("test-session-id", "player-1")).rejects.toThrow(
        "Cannot remove player. Minimum 8 players required for 2 courts"
      );
    });
  });

  describe("togglePlayerSitOut", () => {
    it("toggles forceSitOut flag to true", async () => {
      const mockSession = createMockSession();
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await togglePlayerSitOut("test-session-id", "player-1");

      expect(result.players[0].forceSitOut).toBe(true);
    });

    it("toggles forceSitOut flag back to false", async () => {
      const mockSession = createMockSession();
      mockSession.players[0].forceSitOut = true;
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await togglePlayerSitOut("test-session-id", "player-1");

      expect(result.players[0].forceSitOut).toBe(false);
    });

    it("throws error if player not found", async () => {
      const mockSession = createMockSession();
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);

      await expect(togglePlayerSitOut("test-session-id", "nonexistent")).rejects.toThrow(
        "Player nonexistent not found in session"
      );
    });
  });

  describe("startNextRound", () => {
    it("starts the first round", async () => {
      const mockSession = createMockSession();
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await startNextRound("test-session-id");

      expect(result.currentRound).not.toBeNull();
      expect(result.currentRound?.roundNumber).toBe(1);
      expect(result.currentRound?.matches.length).toBe(2); // 2 courts
    });

    it("increments round number for subsequent rounds", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [],
          benchedPlayers: [],
          completed: true,
        },
      });
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await startNextRound("test-session-id");

      expect(result.currentRound?.roundNumber).toBe(2);
    });

    it("throws error if current round is not completed", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [],
          benchedPlayers: [],
          completed: false,
        },
      });
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);

      await expect(startNextRound("test-session-id")).rejects.toThrow(
        "Current round is not completed yet"
      );
    });

    it("updates roundsSatOut for benched players", async () => {
      const mockSession = createMockSession();
      // Add more players so some will be benched (10 players, 2 courts = 2 benched)
      mockSession.players.push(
        {
          id: "player-9",
          name: "Player9",
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          pointDifferential: 0,
          roundsSatOut: 0,
          consecutiveRoundsSatOut: 0,
          forceSitOut: false,
        },
        {
          id: "player-10",
          name: "Player10",
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          pointDifferential: 0,
          roundsSatOut: 0,
          consecutiveRoundsSatOut: 0,
          forceSitOut: false,
        }
      );
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await startNextRound("test-session-id");

      // Find benched players and verify their roundsSatOut incremented
      for (const benchedPlayer of result.currentRound!.benchedPlayers) {
        const player = result.players.find((p) => p.id === benchedPlayer.id);
        expect(player?.roundsSatOut).toBeGreaterThan(0);
      }
    });
  });

  describe("cancelCurrentRound", () => {
    it("cancels an active round", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [],
          benchedPlayers: [{ id: "player-1", name: "Player1" } as Player],
          completed: false,
        },
      });
      mockSession.players[0].roundsSatOut = 1;
      mockSession.players[0].consecutiveRoundsSatOut = 1;
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await cancelCurrentRound("test-session-id");

      expect(result.currentRound).toBeNull();
    });

    it("reverses roundsSatOut for benched players", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [],
          benchedPlayers: [{ id: "player-1", name: "Player1" } as Player],
          completed: false,
        },
      });
      mockSession.players[0].roundsSatOut = 1;
      mockSession.players[0].consecutiveRoundsSatOut = 1;
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await cancelCurrentRound("test-session-id");

      expect(result.players[0].roundsSatOut).toBe(0);
      expect(result.players[0].consecutiveRoundsSatOut).toBe(0);
    });

    it("throws error if no active round", async () => {
      const mockSession = createMockSession();
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);

      await expect(cancelCurrentRound("test-session-id")).rejects.toThrow(
        "No active round to cancel"
      );
    });

    it("throws error if round is completed", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [],
          benchedPlayers: [],
          completed: true,
        },
      });
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);

      await expect(cancelCurrentRound("test-session-id")).rejects.toThrow(
        "Cannot cancel a completed round"
      );
    });
  });

  describe("completeCurrentRound", () => {
    it("completes a round with valid scores", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [
            {
              id: "match-1",
              courtNumber: 1,
              team1: {
                player1: {
                  id: "player-1",
                  name: "Player1",
                  gamesPlayed: 0,
                  wins: 0,
                  losses: 0,
                  pointDifferential: 0,
                  roundsSatOut: 0,
                  consecutiveRoundsSatOut: 0,
                  forceSitOut: false,
                },
                player2: {
                  id: "player-2",
                  name: "Player2",
                  gamesPlayed: 0,
                  wins: 0,
                  losses: 0,
                  pointDifferential: 0,
                  roundsSatOut: 0,
                  consecutiveRoundsSatOut: 0,
                  forceSitOut: false,
                },
              },
              team2: {
                player1: {
                  id: "player-3",
                  name: "Player3",
                  gamesPlayed: 0,
                  wins: 0,
                  losses: 0,
                  pointDifferential: 0,
                  roundsSatOut: 0,
                  consecutiveRoundsSatOut: 0,
                  forceSitOut: false,
                },
                player2: {
                  id: "player-4",
                  name: "Player4",
                  gamesPlayed: 0,
                  wins: 0,
                  losses: 0,
                  pointDifferential: 0,
                  roundsSatOut: 0,
                  consecutiveRoundsSatOut: 0,
                  forceSitOut: false,
                },
              },
              completed: false,
            },
          ],
          benchedPlayers: [],
          completed: false,
        },
      });

      // Mock updateSessionAtomic to execute the callback
      vi.mocked(redis.updateSessionAtomic).mockImplementation(async (sessionId, callback) => {
        return callback(mockSession);
      });

      const result = await completeCurrentRound("test-session-id", {
        scores: [{ matchId: "match-1", team1Score: 11, team2Score: 9 }],
      });

      expect(result.currentRound?.completed).toBe(true);
      expect(result.gameHistory).toHaveLength(1);
    });

    it("throws error for tie scores", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [
            {
              id: "match-1",
              courtNumber: 1,
              team1: {
                player1: { id: "player-1", name: "Player1" } as Player,
                player2: { id: "player-2", name: "Player2" } as Player,
              },
              team2: {
                player1: { id: "player-3", name: "Player3" } as Player,
                player2: { id: "player-4", name: "Player4" } as Player,
              },
              completed: false,
            },
          ],
          benchedPlayers: [],
          completed: false,
        },
      });

      vi.mocked(redis.updateSessionAtomic).mockImplementation(async (sessionId, callback) => {
        return callback(mockSession);
      });

      await expect(
        completeCurrentRound("test-session-id", {
          scores: [{ matchId: "match-1", team1Score: 11, team2Score: 11 }],
        })
      ).rejects.toThrow("Tie scores are not allowed");
    });

    it("throws error for negative scores", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [
            {
              id: "match-1",
              courtNumber: 1,
              team1: {
                player1: { id: "player-1", name: "Player1" } as Player,
                player2: { id: "player-2", name: "Player2" } as Player,
              },
              team2: {
                player1: { id: "player-3", name: "Player3" } as Player,
                player2: { id: "player-4", name: "Player4" } as Player,
              },
              completed: false,
            },
          ],
          benchedPlayers: [],
          completed: false,
        },
      });

      vi.mocked(redis.updateSessionAtomic).mockImplementation(async (sessionId, callback) => {
        return callback(mockSession);
      });

      await expect(
        completeCurrentRound("test-session-id", {
          scores: [{ matchId: "match-1", team1Score: -1, team2Score: 5 }],
        })
      ).rejects.toThrow("Scores cannot be negative");
    });

    it("throws error if no active round", async () => {
      const mockSession = createMockSession();

      vi.mocked(redis.updateSessionAtomic).mockImplementation(async (sessionId, callback) => {
        return callback(mockSession);
      });

      await expect(
        completeCurrentRound("test-session-id", {
          scores: [{ matchId: "match-1", team1Score: 11, team2Score: 9 }],
        })
      ).rejects.toThrow("No active round to complete");
    });

    it("throws error if no scores provided", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [],
          benchedPlayers: [],
          completed: false,
        },
      });

      vi.mocked(redis.updateSessionAtomic).mockImplementation(async (sessionId, callback) => {
        return callback(mockSession);
      });

      await expect(
        completeCurrentRound("test-session-id", {
          scores: [],
        })
      ).rejects.toThrow("No scores provided");
    });

    it("clears forceSitOut flags when round completes", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [
            {
              id: "match-1",
              courtNumber: 1,
              team1: {
                player1: {
                  id: "player-1",
                  name: "Player1",
                  gamesPlayed: 0,
                  wins: 0,
                  losses: 0,
                  pointDifferential: 0,
                  roundsSatOut: 0,
                  consecutiveRoundsSatOut: 0,
                  forceSitOut: true,
                },
                player2: {
                  id: "player-2",
                  name: "Player2",
                  gamesPlayed: 0,
                  wins: 0,
                  losses: 0,
                  pointDifferential: 0,
                  roundsSatOut: 0,
                  consecutiveRoundsSatOut: 0,
                  forceSitOut: false,
                },
              },
              team2: {
                player1: {
                  id: "player-3",
                  name: "Player3",
                  gamesPlayed: 0,
                  wins: 0,
                  losses: 0,
                  pointDifferential: 0,
                  roundsSatOut: 0,
                  consecutiveRoundsSatOut: 0,
                  forceSitOut: false,
                },
                player2: {
                  id: "player-4",
                  name: "Player4",
                  gamesPlayed: 0,
                  wins: 0,
                  losses: 0,
                  pointDifferential: 0,
                  roundsSatOut: 0,
                  consecutiveRoundsSatOut: 0,
                  forceSitOut: false,
                },
              },
              completed: false,
            },
          ],
          benchedPlayers: [],
          completed: false,
        },
      });
      mockSession.players[0].forceSitOut = true;

      vi.mocked(redis.updateSessionAtomic).mockImplementation(async (sessionId, callback) => {
        return callback(mockSession);
      });

      const result = await completeCurrentRound("test-session-id", {
        scores: [{ matchId: "match-1", team1Score: 11, team2Score: 9 }],
      });

      expect(result.players[0].forceSitOut).toBe(false);
    });
  });

  describe("updateNumCourts", () => {
    it("updates number of courts", async () => {
      const mockSession = createMockSession();
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await updateNumCourts("test-session-id", 3);

      expect(result.numCourts).toBe(3);
    });

    it("throws error for less than 1 court", async () => {
      const mockSession = createMockSession();
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);

      await expect(updateNumCourts("test-session-id", 0)).rejects.toThrow(
        "Number of courts must be at least 1"
      );
    });

    it("throws error if round is in progress", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [],
          benchedPlayers: [],
          completed: false,
        },
      });
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);

      await expect(updateNumCourts("test-session-id", 3)).rejects.toThrow(
        "Cannot change number of courts while a round is in progress"
      );
    });

    it("clears completed round when changing number of courts", async () => {
      const mockSession = createMockSession({
        numCourts: 2,
        currentRound: {
          roundNumber: 1,
          matches: [],
          benchedPlayers: [],
          completed: true,
        },
      });
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await updateNumCourts("test-session-id", 1);

      expect(result.numCourts).toBe(1);
      expect(result.currentRound).toBeNull();
    });

    it("keeps completed round if court number stays the same", async () => {
      const mockSession = createMockSession({
        numCourts: 2,
        currentRound: {
          roundNumber: 1,
          matches: [],
          benchedPlayers: [],
          completed: true,
        },
      });
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await updateNumCourts("test-session-id", 2);

      expect(result.numCourts).toBe(2);
      expect(result.currentRound).not.toBeNull();
    });
  });

  describe("endSession", () => {
    it("ends a session", async () => {
      const mockSession = createMockSession();
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);
      vi.mocked(redis.saveSession).mockResolvedValue();

      const result = await endSession("test-session-id");

      expect(result.ended).toBe(true);
    });

    it("throws error if round is in progress", async () => {
      const mockSession = createMockSession({
        currentRound: {
          roundNumber: 1,
          matches: [],
          benchedPlayers: [],
          completed: false,
        },
      });
      vi.mocked(redis.getSession).mockResolvedValue(mockSession);

      await expect(endSession("test-session-id")).rejects.toThrow(
        "Cannot end session while a round is in progress"
      );
    });
  });
});
