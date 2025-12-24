import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the redis module before importing
const mockRedisClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(),
  set: vi.fn().mockResolvedValue("OK"),
  del: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(true),
  exists: vi.fn().mockResolvedValue(0),
  watch: vi.fn().mockResolvedValue("OK"),
  unwatch: vi.fn().mockResolvedValue("OK"),
  multi: vi.fn(() => ({
    set: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(["OK", true]),
  })),
  scan: vi.fn().mockResolvedValue({ cursor: 0, keys: [] }),
  on: vi.fn(),
};

vi.mock("redis", () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

// Import after mocking
import {
  initRedis,
  getRedisClient,
  saveSession,
  setActiveSession,
  getActiveSessionId,
  getSession,
  deleteSession,
  getAllSessionIds,
  updateSessionAtomic,
  flushAllSessions,
  closeRedis,
} from "./redis";
import { Session } from "../types/game";

const mockSession: Session = {
  id: "test-session-123",
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
  courtHistory: {},
  numCourts: 1,
  createdAt: Date.now(),
};

describe("Redis Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initRedis", () => {
    it("should initialize Redis client with default URL", async () => {
      await initRedis();

      expect(mockRedisClient.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it("should use REDIS_URL from environment if set", async () => {
      const originalEnv = process.env.REDIS_URL;
      process.env.REDIS_URL = "redis://custom-host:6380";

      await initRedis();

      expect(mockRedisClient.connect).toHaveBeenCalled();

      process.env.REDIS_URL = originalEnv;
    });
  });

  describe("getRedisClient", () => {
    it("should return the Redis client after initialization", async () => {
      await initRedis();
      const client = getRedisClient();
      expect(client).toBeDefined();
    });
  });

  describe("saveSession", () => {
    beforeEach(async () => {
      await initRedis();
    });

    it("should save session to Redis with 24-hour expiry", async () => {
      const mockMulti = {
        set: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(["OK", true]),
      };
      mockRedisClient.multi.mockReturnValue(mockMulti);

      await saveSession(mockSession);

      expect(mockRedisClient.watch).toHaveBeenCalledWith("session:test-session-123");
      expect(mockMulti.set).toHaveBeenCalledWith(
        "session:test-session-123",
        JSON.stringify(mockSession)
      );
      expect(mockMulti.expire).toHaveBeenCalledWith("session:test-session-123", 86400);
      expect(mockMulti.exec).toHaveBeenCalled();
    });

    it("should retry on concurrent modification", async () => {
      const mockMulti = {
        set: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi
          .fn()
          .mockResolvedValueOnce(null) // First attempt fails
          .mockResolvedValue(["OK", true]), // Second attempt succeeds
      };
      mockRedisClient.multi.mockReturnValue(mockMulti);

      await saveSession(mockSession);

      expect(mockRedisClient.watch).toHaveBeenCalledTimes(2);
      expect(mockMulti.exec).toHaveBeenCalledTimes(2);
    });

    it("should throw after max retries", async () => {
      const mockMulti = {
        set: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null), // Always fails
      };
      mockRedisClient.multi.mockReturnValue(mockMulti);

      await expect(saveSession(mockSession)).rejects.toThrow(/after 3 retries/);
    });
  });

  describe("setActiveSession", () => {
    beforeEach(async () => {
      await initRedis();
    });

    it("should set active session ID with 24-hour expiry", async () => {
      await setActiveSession("session-456");

      expect(mockRedisClient.set).toHaveBeenCalledWith("active-session-id", "session-456");
      expect(mockRedisClient.expire).toHaveBeenCalledWith("active-session-id", 86400);
    });
  });

  describe("getActiveSessionId", () => {
    beforeEach(async () => {
      await initRedis();
    });

    it("should return active session ID when set", async () => {
      mockRedisClient.get.mockResolvedValue("active-session-123");

      const result = await getActiveSessionId();

      expect(mockRedisClient.get).toHaveBeenCalledWith("active-session-id");
      expect(result).toBe("active-session-123");
    });

    it("should return null when no active session", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await getActiveSessionId();

      expect(result).toBeNull();
    });
  });

  describe("getSession", () => {
    beforeEach(async () => {
      await initRedis();
    });

    it("should return parsed session when found", async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await getSession("test-session-123");

      expect(mockRedisClient.get).toHaveBeenCalledWith("session:test-session-123");
      expect(result).toEqual(mockSession);
    });

    it("should return null when session not found", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await getSession("non-existent");

      expect(result).toBeNull();
    });

    it("should delete corrupted session data and throw error", async () => {
      mockRedisClient.get.mockResolvedValue("invalid json{{{");

      await expect(getSession("corrupted-session")).rejects.toThrow(/corrupted/);
      expect(mockRedisClient.del).toHaveBeenCalledWith("session:corrupted-session");
    });
  });

  describe("deleteSession", () => {
    beforeEach(async () => {
      await initRedis();
    });

    it("should delete session from Redis", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await deleteSession("test-session-123");

      expect(mockRedisClient.del).toHaveBeenCalledWith("session:test-session-123");
    });

    it("should clear active session ID if deleted session was active", async () => {
      mockRedisClient.get.mockResolvedValue("test-session-123");

      await deleteSession("test-session-123");

      expect(mockRedisClient.del).toHaveBeenCalledWith("session:test-session-123");
      expect(mockRedisClient.del).toHaveBeenCalledWith("active-session-id");
    });
  });

  describe("getAllSessionIds", () => {
    beforeEach(async () => {
      await initRedis();
    });

    it("should return all session IDs", async () => {
      mockRedisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: ["session:id1", "session:id2", "session:id3"],
      });

      const result = await getAllSessionIds();

      expect(result).toEqual(["id1", "id2", "id3"]);
    });

    it("should handle pagination with cursor", async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce({
          cursor: 10,
          keys: ["session:id1", "session:id2"],
        })
        .mockResolvedValueOnce({
          cursor: 0,
          keys: ["session:id3"],
        });

      const result = await getAllSessionIds();

      expect(result).toEqual(["id1", "id2", "id3"]);
      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
    });

    it("should return empty array when no sessions exist", async () => {
      mockRedisClient.scan.mockResolvedValue({ cursor: 0, keys: [] });

      const result = await getAllSessionIds();

      expect(result).toEqual([]);
    });
  });

  describe("updateSessionAtomic", () => {
    beforeEach(async () => {
      await initRedis();
    });

    it("should atomically update session", async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
      const mockMulti = {
        set: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(["OK", true]),
      };
      mockRedisClient.multi.mockReturnValue(mockMulti);

      const result = await updateSessionAtomic("test-session-123", (session) => ({
        ...session,
        numCourts: 2,
      }));

      expect(result.numCourts).toBe(2);
      expect(mockRedisClient.watch).toHaveBeenCalledWith("session:test-session-123");
    });

    it("should throw when session not found", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(updateSessionAtomic("non-existent", (s) => s)).rejects.toThrow(/not found/);
    });

    it("should retry on concurrent modification", async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
      const mockMulti = {
        set: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValueOnce(null).mockResolvedValue(["OK", true]),
      };
      mockRedisClient.multi.mockReturnValue(mockMulti);

      const result = await updateSessionAtomic("test-session-123", (s) => s);

      expect(mockRedisClient.watch).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it("should support async update functions", async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
      const mockMulti = {
        set: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(["OK", true]),
      };
      mockRedisClient.multi.mockReturnValue(mockMulti);

      const result = await updateSessionAtomic("test-session-123", async (session) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { ...session, numCourts: 3 };
      });

      expect(result.numCourts).toBe(3);
    });
  });

  describe("flushAllSessions", () => {
    beforeEach(async () => {
      await initRedis();
    });

    it("should delete all session keys and active session ID", async () => {
      mockRedisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: ["session:id1", "session:id2"],
      });
      mockRedisClient.exists.mockResolvedValue(1);

      await flushAllSessions();

      expect(mockRedisClient.del).toHaveBeenCalledWith([
        "session:id1",
        "session:id2",
        "active-session-id",
      ]);
    });

    it("should handle empty database", async () => {
      mockRedisClient.scan.mockResolvedValue({ cursor: 0, keys: [] });
      mockRedisClient.exists.mockResolvedValue(0);

      await flushAllSessions();

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe("closeRedis", () => {
    it("should close Redis connection", async () => {
      await initRedis();
      await closeRedis();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });
});
