import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ReservationStorage } from "./reservationStorage.redis.js";
import type { Reservation } from "../types/reservation.js";

// Mock Redis client
vi.mock("./redis.js", () => ({
  default: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    sAdd: vi.fn(),
    sMembers: vi.fn(),
    sRem: vi.fn(),
  },
}));

import redisClient from "./redis.js";

describe("ReservationStorage", () => {
  let storage: ReservationStorage;

  const mockReservation: Reservation = {
    id: "res_123_abc",
    date: new Date("2025-12-22"),
    startTime: "5:30pm",
    endTime: "7:00pm",
    players: ["Alice", "Bob", "Charlie", "Diana"],
    court: "North",
    organizer: "Alice",
    createdAt: new Date("2025-12-22T10:00:00Z"),
    rawEmail: "test email",
  };

  beforeEach(() => {
    storage = new ReservationStorage();
    vi.clearAllMocks();
  });

  describe("addReservation", () => {
    it("should add a new reservation to Redis", async () => {
      vi.mocked(redisClient.sMembers).mockResolvedValue([]);
      vi.mocked(redisClient.set).mockResolvedValue("OK");
      vi.mocked(redisClient.sAdd).mockResolvedValue(1);

      await storage.addReservation(mockReservation);

      expect(redisClient.set).toHaveBeenCalledWith(
        `reservation:${mockReservation.id}`,
        JSON.stringify(mockReservation),
        { EX: 7 * 24 * 60 * 60 }
      );
      expect(redisClient.sAdd).toHaveBeenCalledWith("reservation:index", mockReservation.id);
    });

    it("should skip duplicate reservations", async () => {
      const existingReservation = { ...mockReservation, id: "res_existing" };

      vi.mocked(redisClient.sMembers).mockResolvedValue([existingReservation.id]);
      vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(existingReservation));

      await storage.addReservation(mockReservation);

      expect(redisClient.set).not.toHaveBeenCalled();
      expect(redisClient.sAdd).not.toHaveBeenCalled();
    });
  });

  describe("getAllReservations", () => {
    it("should return all reservations from Redis", async () => {
      vi.mocked(redisClient.sMembers).mockResolvedValue(["res_1", "res_2"]);
      vi.mocked(redisClient.get)
        .mockResolvedValueOnce(JSON.stringify({ ...mockReservation, id: "res_1" }))
        .mockResolvedValueOnce(JSON.stringify({ ...mockReservation, id: "res_2" }));

      const result = await storage.getAllReservations();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("res_1");
      expect(result[1].id).toBe("res_2");
    });

    it("should remove expired reservations from index", async () => {
      vi.mocked(redisClient.sMembers).mockResolvedValue(["res_1", "res_expired"]);
      vi.mocked(redisClient.get)
        .mockResolvedValueOnce(JSON.stringify({ ...mockReservation, id: "res_1" }))
        .mockResolvedValueOnce(null); // Expired

      vi.mocked(redisClient.sRem).mockResolvedValue(1);

      const result = await storage.getAllReservations();

      expect(result).toHaveLength(1);
      expect(redisClient.sRem).toHaveBeenCalledWith("reservation:index", "res_expired");
    });

    it("should return empty array when no reservations exist", async () => {
      vi.mocked(redisClient.sMembers).mockResolvedValue([]);

      const result = await storage.getAllReservations();

      expect(result).toEqual([]);
    });
  });

  describe("getReservation", () => {
    it("should return a specific reservation by ID", async () => {
      vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(mockReservation));

      const result = await storage.getReservation(mockReservation.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockReservation.id);
      expect(result?.startTime).toBe(mockReservation.startTime);
      expect(result?.endTime).toBe(mockReservation.endTime);
      expect(result?.court).toBe(mockReservation.court);
      expect(result?.organizer).toBe(mockReservation.organizer);
      expect(result?.players).toEqual(mockReservation.players);
      expect(redisClient.get).toHaveBeenCalledWith(`reservation:${mockReservation.id}`);
    });

    it("should return undefined for non-existent reservation", async () => {
      vi.mocked(redisClient.get).mockResolvedValue(null);

      const result = await storage.getReservation("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("deleteReservation", () => {
    it("should delete a reservation and remove from index", async () => {
      vi.mocked(redisClient.del).mockResolvedValue(1);
      vi.mocked(redisClient.sRem).mockResolvedValue(1);

      const result = await storage.deleteReservation(mockReservation.id);

      expect(result).toBe(true);
      expect(redisClient.del).toHaveBeenCalledWith(`reservation:${mockReservation.id}`);
      expect(redisClient.sRem).toHaveBeenCalledWith("reservation:index", mockReservation.id);
    });

    it("should return false when reservation doesn't exist", async () => {
      vi.mocked(redisClient.del).mockResolvedValue(0);

      const result = await storage.deleteReservation("nonexistent");

      expect(result).toBe(false);
      expect(redisClient.sRem).not.toHaveBeenCalled();
    });
  });

  describe("queryReservations", () => {
    beforeEach(() => {
      const reservation1 = {
        ...mockReservation,
        id: "res_1",
        date: new Date("2025-12-22"),
        startTime: "5:30pm",
      };
      const reservation2 = {
        ...mockReservation,
        id: "res_2",
        date: new Date("2025-12-23"),
        startTime: "6:00pm",
      };

      vi.mocked(redisClient.sMembers).mockResolvedValue(["res_1", "res_2"]);
      vi.mocked(redisClient.get)
        .mockResolvedValueOnce(JSON.stringify(reservation1))
        .mockResolvedValueOnce(JSON.stringify(reservation2));
    });

    it("should filter by date", async () => {
      const result = await storage.queryReservations({
        date: "2025-12-22",
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("res_1");
    });

    it("should filter by startTime", async () => {
      vi.mocked(redisClient.sMembers).mockResolvedValue(["res_1", "res_2"]);
      vi.mocked(redisClient.get)
        .mockResolvedValueOnce(
          JSON.stringify({ ...mockReservation, id: "res_1", startTime: "5:30pm" })
        )
        .mockResolvedValueOnce(
          JSON.stringify({ ...mockReservation, id: "res_2", startTime: "6:00pm" })
        );

      const result = await storage.queryReservations({
        startTime: "5:30pm",
      });

      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBe("5:30pm");
    });
  });

  describe("getTodayReservations", () => {
    it("should query reservations for today's date", async () => {
      const now = new Date();
      const todayDateString = now.toISOString().split("T")[0];

      // Mock empty result for simplicity - just testing the query is made correctly
      vi.mocked(redisClient.sMembers).mockResolvedValue([]);

      const result = await storage.getTodayReservations();

      // Should return array (even if empty)
      expect(Array.isArray(result)).toBe(true);

      // Verify it called getAllReservations (which calls sMembers)
      expect(redisClient.sMembers).toHaveBeenCalled();
    });
  });
});
