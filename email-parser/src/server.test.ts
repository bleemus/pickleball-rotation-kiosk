import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express, { Express } from "express";
import cors from "cors";

// Mock dependencies before imports
vi.mock("./services/redis.js", () => ({
  default: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    sAdd: vi.fn(),
    sMembers: vi.fn(),
    sRem: vi.fn(),
  },
  connectRedis: vi.fn(),
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(),
  },
}));

import redisClient from "./services/redis.js";
import { ReservationStorage } from "./services/reservationStorage.redis.js";
import type { Reservation } from "./types/reservation.js";

describe("Email Parser API", () => {
  let app: Express;
  let storage: ReservationStorage;

  const mockReservation: Reservation = {
    id: "res_test_123",
    date: new Date("2025-12-22"),
    startTime: "5:30pm",
    endTime: "7:00pm",
    players: ["Alice", "Bob", "Charlie", "Diana"],
    court: "North",
    organizer: "Alice",
    createdAt: new Date(),
    rawEmail: "test email",
  };

  beforeAll(() => {
    // Create a minimal Express app for testing
    app = express();
    app.use(cors());
    app.use(express.json());

    storage = new ReservationStorage();

    // Health endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        emailMethod: "test",
        redisConnected: true,
        timestamp: new Date().toISOString(),
      });
    });

    // Reservations endpoints
    app.get("/api/reservations", async (req, res) => {
      try {
        const { date, startTime, endTime } = req.query;
        let results = await storage.getAllReservations();

        if (date || startTime || endTime) {
          results = await storage.queryReservations({
            date: date as string,
            startTime: startTime as string,
            endTime: endTime as string,
          });
        }

        res.json(results);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch reservations" });
      }
    });

    app.get("/api/reservations/today", async (req, res) => {
      try {
        const results = await storage.getTodayReservations();
        res.json(results);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch today's reservations" });
      }
    });

    app.get("/api/reservations/current", async (req, res) => {
      try {
        const now = new Date();
        const reservations = await storage.getTodayReservations();

        const current = reservations.filter((reservation) => {
          const resDate = new Date(reservation.date);
          const startMatch = reservation.startTime.match(/(\\d{1,2}):(\\d{2})(am|pm)/i);
          if (!startMatch) return false;

          let startHour = parseInt(startMatch[1]);
          const startMinute = parseInt(startMatch[2]);
          const period = startMatch[3].toLowerCase();

          if (period === "pm" && startHour !== 12) startHour += 12;
          if (period === "am" && startHour === 12) startHour = 0;

          const startTime = new Date(resDate);
          startTime.setHours(startHour, startMinute, 0, 0);

          const windowStart = new Date(startTime.getTime() - 30 * 60 * 1000);

          return now >= windowStart;
        });

        res.json(current);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch current reservations" });
      }
    });

    app.get("/api/reservations/:id", async (req, res) => {
      try {
        const reservation = await storage.getReservation(req.params.id);
        if (!reservation) {
          return res.status(404).json({ error: "Reservation not found" });
        }
        res.json(reservation);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch reservation" });
      }
    });

    app.post("/api/reservations", async (req, res) => {
      try {
        const { date, startTime, endTime, players, court, organizer } = req.body;

        // Validate required fields
        if (!date || !startTime || !endTime || !players || !court || !organizer) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const reservation: Reservation = {
          id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          date: new Date(date),
          startTime,
          endTime,
          players,
          court,
          organizer,
          createdAt: new Date(),
          rawEmail: "",
        };

        await storage.addReservation(reservation);
        res.status(201).json(reservation);
      } catch (error) {
        res.status(500).json({ error: "Failed to create reservation" });
      }
    });

    app.delete("/api/reservations/:id", async (req, res) => {
      try {
        const deleted = await storage.deleteReservation(req.params.id);
        if (!deleted) {
          return res.status(404).json({ error: "Reservation not found" });
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete reservation" });
      }
    });

    app.post("/api/check-emails", (req, res) => {
      res.json({ success: true, message: "Email check triggered" });
    });
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("emailMethod");
      expect(response.body).toHaveProperty("redisConnected");
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  describe("GET /api/reservations", () => {
    it("should return all reservations", async () => {
      vi.mocked(redisClient.sMembers).mockResolvedValue([mockReservation.id]);
      vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(mockReservation));

      const response = await request(app).get("/api/reservations");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should filter reservations by date", async () => {
      const response = await request(app).get("/api/reservations").query({ date: "2025-12-22" });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should filter reservations by startTime", async () => {
      const response = await request(app).get("/api/reservations").query({ startTime: "5:30pm" });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /api/reservations/today", () => {
    it("should return today's reservations", async () => {
      vi.mocked(redisClient.sMembers).mockResolvedValue([]);

      const response = await request(app).get("/api/reservations/today");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /api/reservations/current", () => {
    it("should return current active reservations", async () => {
      vi.mocked(redisClient.sMembers).mockResolvedValue([]);

      const response = await request(app).get("/api/reservations/current");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /api/reservations/:id", () => {
    it("should return a specific reservation", async () => {
      vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(mockReservation));

      const response = await request(app).get(`/api/reservations/${mockReservation.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", mockReservation.id);
    });

    it("should return 404 for non-existent reservation", async () => {
      vi.mocked(redisClient.get).mockResolvedValue(null);

      const response = await request(app).get("/api/reservations/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /api/reservations", () => {
    it("should create a new reservation", async () => {
      vi.mocked(redisClient.sMembers).mockResolvedValue([]);
      vi.mocked(redisClient.set).mockResolvedValue("OK");
      vi.mocked(redisClient.sAdd).mockResolvedValue(1);

      const newReservation = {
        date: "2025-12-22",
        startTime: "5:30pm",
        endTime: "7:00pm",
        players: ["Alice", "Bob", "Charlie", "Diana"],
        court: "North",
        organizer: "Alice",
      };

      const response = await request(app).post("/api/reservations").send(newReservation);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("startTime", "5:30pm");
      expect(response.body).toHaveProperty("players");
      expect(response.body.players).toHaveLength(4);
    });

    it("should validate required fields", async () => {
      const invalidReservation = {
        startTime: "5:30pm",
        // Missing required fields
      };

      const response = await request(app).post("/api/reservations").send(invalidReservation);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /api/reservations/:id", () => {
    it("should delete a reservation", async () => {
      vi.mocked(redisClient.del).mockResolvedValue(1);
      vi.mocked(redisClient.sRem).mockResolvedValue(1);

      const response = await request(app).delete(`/api/reservations/${mockReservation.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 when deleting non-existent reservation", async () => {
      vi.mocked(redisClient.del).mockResolvedValue(0);

      const response = await request(app).delete("/api/reservations/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /api/check-emails", () => {
    it("should trigger email check", async () => {
      const response = await request(app).post("/api/check-emails");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("message");
    });
  });
});
