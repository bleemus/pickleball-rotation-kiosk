import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

// Mock gameService - using vi.hoisted for proper hoisting
const mockGameService = vi.hoisted(() => ({
  createSession: vi.fn(),
  getSessionById: vi.fn(),
  getActiveSession: vi.fn(),
  addPlayer: vi.fn(),
  removePlayer: vi.fn(),
  togglePlayerSitOut: vi.fn(),
  updateNumCourts: vi.fn(),
  startNextRound: vi.fn(),
  cancelCurrentRound: vi.fn(),
  completeCurrentRound: vi.fn(),
  getCurrentRound: vi.fn(),
  getGameHistory: vi.fn(),
  deleteSessionById: vi.fn(),
  endSession: vi.fn(),
}));

vi.mock("../services/gameService", () => mockGameService);

// Mock redis
const mockFlushAllSessions = vi.hoisted(() => vi.fn());
vi.mock("../services/redis", () => ({
  flushAllSessions: mockFlushAllSessions,
}));

// Import the router after mocking
import router from "./game";

// Helper to create mock request/response
function createMockReqRes(options: {
  params?: Record<string, string>;
  body?: unknown;
  method?: string;
}) {
  const req = {
    params: options.params || {},
    body: options.body || {},
    method: options.method || "GET",
  } as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;

  return { req, res };
}

// Helper to find route handler
function getRouteHandler(method: string, path: string) {
  const layer = router.stack.find((layer: any) => {
    if (!layer.route) return false;
    return layer.route.path === path && layer.route.methods[method.toLowerCase()];
  });

  if (!layer || !layer.route) {
    throw new Error(`Route ${method} ${path} not found`);
  }

  return layer.route.stack[0].handle;
}

const mockSession = {
  id: "session-123",
  players: [
    {
      id: "1",
      name: "Alice",
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      pointDifferential: 0,
      roundsSatOut: 0,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
    {
      id: "2",
      name: "Bob",
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      pointDifferential: 0,
      roundsSatOut: 0,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
    {
      id: "3",
      name: "Charlie",
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      pointDifferential: 0,
      roundsSatOut: 0,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
    {
      id: "4",
      name: "Dave",
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      pointDifferential: 0,
      roundsSatOut: 0,
      consecutiveRoundsSatOut: 0,
      forceSitOut: false,
    },
  ],
  currentRound: null,
  gameHistory: [],
  partnershipHistory: {},
  opponentHistory: {},
  numCourts: 1,
  createdAt: Date.now(),
};

describe("Game Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /network-info", () => {
    it("should return network information", async () => {
      const handler = getRouteHandler("GET", "/network-info");
      const { req, res } = createMockReqRes({});
      const next = vi.fn();

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: expect.any(String),
          port: expect.any(Number),
          allIPs: expect.any(Array),
        })
      );
    });
  });

  describe("GET /wifi-info", () => {
    it("should return 404 when WIFI_SSID not configured", async () => {
      const originalSSID = process.env.WIFI_SSID;
      delete process.env.WIFI_SSID;

      const handler = getRouteHandler("GET", "/wifi-info");
      const { req, res } = createMockReqRes({});

      const next = vi.fn();
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));

      process.env.WIFI_SSID = originalSSID;
    });

    it("should return WiFi info when configured", async () => {
      const originalSSID = process.env.WIFI_SSID;
      const originalPassword = process.env.WIFI_PASSWORD;
      process.env.WIFI_SSID = "TestNetwork";
      process.env.WIFI_PASSWORD = "secret123";

      const handler = getRouteHandler("GET", "/wifi-info");
      const { req, res } = createMockReqRes({});

      const next = vi.fn();
      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        ssid: "TestNetwork",
        password: "secret123",
      });

      process.env.WIFI_SSID = originalSSID;
      process.env.WIFI_PASSWORD = originalPassword;
    });
  });

  describe("POST /test/cleanup", () => {
    it("should flush sessions in non-production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";
      mockFlushAllSessions.mockResolvedValue(undefined);

      const handler = getRouteHandler("POST", "/test/cleanup");
      const { req, res } = createMockReqRes({});

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockFlushAllSessions).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });

      process.env.NODE_ENV = originalEnv;
    });

    it("should return 403 in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const handler = getRouteHandler("POST", "/test/cleanup");
      const { req, res } = createMockReqRes({});

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockFlushAllSessions).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("GET /session/active", () => {
    it("should return active session", async () => {
      mockGameService.getActiveSession.mockResolvedValue(mockSession);

      const handler = getRouteHandler("GET", "/session/active");
      const { req, res } = createMockReqRes({});

      const next = vi.fn();
      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockSession);
    });

    it("should return 404 when no active session", async () => {
      mockGameService.getActiveSession.mockResolvedValue(null);

      const handler = getRouteHandler("GET", "/session/active");
      const { req, res } = createMockReqRes({});

      const next = vi.fn();
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "No active session" });
    });

    it("should return 500 on error", async () => {
      mockGameService.getActiveSession.mockRejectedValue(new Error("Redis connection failed"));

      const handler = getRouteHandler("GET", "/session/active");
      const { req, res } = createMockReqRes({});

      const next = vi.fn();
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Redis connection failed" });
    });
  });

  describe("POST /session", () => {
    it("should create a new session", async () => {
      mockGameService.createSession.mockResolvedValue(mockSession);

      const handler = getRouteHandler("POST", "/session");
      const { req, res } = createMockReqRes({
        body: { playerNames: ["Alice", "Bob", "Charlie", "Dave"], numCourts: 1 },
      });

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockGameService.createSession).toHaveBeenCalledWith({
        playerNames: ["Alice", "Bob", "Charlie", "Dave"],
        numCourts: 1,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSession);
    });

    it("should return 400 on invalid request", async () => {
      mockGameService.createSession.mockRejectedValue(new Error("Invalid player count"));

      const handler = getRouteHandler("POST", "/session");
      const { req, res } = createMockReqRes({ body: { playerNames: [] } });

      const next = vi.fn();
      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid player count" });
    });
  });

  describe("GET /session/:id", () => {
    it("should return session by ID", async () => {
      mockGameService.getSessionById.mockResolvedValue(mockSession);

      const handler = getRouteHandler("GET", "/session/:id");
      const { req, res } = createMockReqRes({ params: { id: "session-123" } });

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockGameService.getSessionById).toHaveBeenCalledWith("session-123");
      expect(res.json).toHaveBeenCalledWith(mockSession);
    });

    it("should return 404 when session not found", async () => {
      mockGameService.getSessionById.mockRejectedValue(new Error("Session not found"));

      const handler = getRouteHandler("GET", "/session/:id");
      const { req, res } = createMockReqRes({ params: { id: "non-existent" } });
      const next = vi.fn();

      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Session not found" });
    });
  });

  describe("PATCH /session/:id/courts", () => {
    it("should update number of courts", async () => {
      const updatedSession = { ...mockSession, numCourts: 2 };
      mockGameService.updateNumCourts.mockResolvedValue(updatedSession);

      const handler = getRouteHandler("PATCH", "/session/:id/courts");
      const { req, res } = createMockReqRes({
        params: { id: "session-123" },
        body: { numCourts: 2 },
      });

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockGameService.updateNumCourts).toHaveBeenCalledWith("session-123", 2);
      expect(res.json).toHaveBeenCalledWith(updatedSession);
    });
  });

  describe("DELETE /session/:id", () => {
    it("should delete session", async () => {
      mockGameService.deleteSessionById.mockResolvedValue(undefined);

      const handler = getRouteHandler("DELETE", "/session/:id");
      const { req, res } = createMockReqRes({ params: { id: "session-123" } });
      const next = vi.fn();

      await handler(req, res, next);

      expect(mockGameService.deleteSessionById).toHaveBeenCalledWith("session-123");
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe("POST /session/:id/players", () => {
    it("should add player to session", async () => {
      const updatedSession = {
        ...mockSession,
        players: [
          ...mockSession.players,
          {
            id: "5",
            name: "Eve",
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            pointDifferential: 0,
            roundsSatOut: 0,
            consecutiveRoundsSatOut: 0,
            forceSitOut: false,
          },
        ],
      };
      mockGameService.addPlayer.mockResolvedValue(updatedSession);

      const handler = getRouteHandler("POST", "/session/:id/players");
      const { req, res } = createMockReqRes({
        params: { id: "session-123" },
        body: { name: "Eve" },
      });

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockGameService.addPlayer).toHaveBeenCalledWith("session-123", { name: "Eve" });
      expect(res.json).toHaveBeenCalledWith(updatedSession);
    });
  });

  describe("DELETE /session/:id/players/:playerId", () => {
    it("should remove player from session", async () => {
      const updatedSession = {
        ...mockSession,
        players: mockSession.players.slice(0, 3),
      };
      mockGameService.removePlayer.mockResolvedValue(updatedSession);

      const handler = getRouteHandler("DELETE", "/session/:id/players/:playerId");
      const { req, res } = createMockReqRes({
        params: { id: "session-123", playerId: "4" },
      });

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockGameService.removePlayer).toHaveBeenCalledWith("session-123", "4");
      expect(res.json).toHaveBeenCalledWith(updatedSession);
    });
  });

  describe("GET /session/:id/players", () => {
    it("should return all players in session", async () => {
      mockGameService.getSessionById.mockResolvedValue(mockSession);

      const handler = getRouteHandler("GET", "/session/:id/players");
      const { req, res } = createMockReqRes({ params: { id: "session-123" } });

      const next = vi.fn();
      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockSession.players);
    });
  });

  describe("PATCH /session/:id/players/:playerId/sitout", () => {
    it("should toggle player sit out", async () => {
      const updatedSession = { ...mockSession };
      updatedSession.players[0].forceSitOut = true;
      mockGameService.togglePlayerSitOut.mockResolvedValue(updatedSession);

      const handler = getRouteHandler("PATCH", "/session/:id/players/:playerId/sitout");
      const { req, res } = createMockReqRes({
        params: { id: "session-123", playerId: "1" },
      });

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockGameService.togglePlayerSitOut).toHaveBeenCalledWith("session-123", "1");
      expect(res.json).toHaveBeenCalledWith(updatedSession);
    });
  });

  describe("POST /session/:id/round", () => {
    it("should start next round", async () => {
      const sessionWithRound = {
        ...mockSession,
        currentRound: {
          roundNumber: 1,
          matches: [],
          benchedPlayers: [],
          completed: false,
        },
      };
      mockGameService.startNextRound.mockResolvedValue(sessionWithRound);

      const handler = getRouteHandler("POST", "/session/:id/round");
      const { req, res } = createMockReqRes({ params: { id: "session-123" } });

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockGameService.startNextRound).toHaveBeenCalledWith("session-123");
      expect(res.json).toHaveBeenCalledWith(sessionWithRound);
    });
  });

  describe("GET /session/:id/round/current", () => {
    it("should return current round", async () => {
      const currentRound = {
        roundNumber: 1,
        matches: [],
        benchedPlayers: [],
        completed: false,
      };
      mockGameService.getCurrentRound.mockResolvedValue(currentRound);

      const handler = getRouteHandler("GET", "/session/:id/round/current");
      const { req, res } = createMockReqRes({ params: { id: "session-123" } });

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockGameService.getCurrentRound).toHaveBeenCalledWith("session-123");
      expect(res.json).toHaveBeenCalledWith(currentRound);
    });
  });

  describe("DELETE /session/:id/round", () => {
    it("should cancel current round", async () => {
      mockGameService.cancelCurrentRound.mockResolvedValue(mockSession);

      const handler = getRouteHandler("DELETE", "/session/:id/round");
      const { req, res } = createMockReqRes({ params: { id: "session-123" } });

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockGameService.cancelCurrentRound).toHaveBeenCalledWith("session-123");
      expect(res.json).toHaveBeenCalledWith(mockSession);
    });
  });

  describe("POST /session/:id/round/complete", () => {
    it("should complete current round with scores", async () => {
      const completedSession = { ...mockSession };
      mockGameService.completeCurrentRound.mockResolvedValue(completedSession);

      const handler = getRouteHandler("POST", "/session/:id/round/complete");
      const { req, res } = createMockReqRes({
        params: { id: "session-123" },
        body: { scores: [{ matchId: "match-1", team1Score: 11, team2Score: 9 }] },
      });

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockGameService.completeCurrentRound).toHaveBeenCalledWith("session-123", {
        scores: [{ matchId: "match-1", team1Score: 11, team2Score: 9 }],
      });
      expect(res.json).toHaveBeenCalledWith(completedSession);
    });
  });

  describe("GET /session/:id/history", () => {
    it("should return game history", async () => {
      const history = [
        { matchId: "match-1", roundNumber: 1, courtNumber: 1, team1Score: 11, team2Score: 9 },
      ];
      mockGameService.getGameHistory.mockResolvedValue(history);

      const handler = getRouteHandler("GET", "/session/:id/history");
      const { req, res } = createMockReqRes({ params: { id: "session-123" } });

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockGameService.getGameHistory).toHaveBeenCalledWith("session-123");
      expect(res.json).toHaveBeenCalledWith(history);
    });
  });

  describe("POST /session/:id/end", () => {
    it("should end session", async () => {
      const endedSession = { ...mockSession, ended: true };
      mockGameService.endSession.mockResolvedValue(endedSession);

      const handler = getRouteHandler("POST", "/session/:id/end");
      const { req, res } = createMockReqRes({ params: { id: "session-123" } });

      const next = vi.fn();
      await handler(req, res, next);

      expect(mockGameService.endSession).toHaveBeenCalledWith("session-123");
      expect(res.json).toHaveBeenCalledWith(endedSession);
    });
  });
});
