import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response } from "express";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import the router after mocking
import router from "./reservations.js";

// Helper to create mock request/response
function createMockReqRes(options: {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  method?: string;
}) {
  const req = {
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    method: options.method || "GET",
  } as unknown as Request;

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

describe("Reservations Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /health", () => {
    it("should return health status when email service is available", async () => {
      const healthData = { status: "ok", emailPollingEnabled: true, emailEnabled: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(healthData),
      });

      const { req, res } = createMockReqRes({});
      const next = vi.fn();
      const handler = getRouteHandler("GET", "/health");

      await handler(req, res, next);

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:3002/health");
      expect(res.json).toHaveBeenCalledWith(healthData);
    });

    it("should return unavailable status when email service returns error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { req, res } = createMockReqRes({});
      const next = vi.fn();
      const handler = getRouteHandler("GET", "/health");

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: "unavailable",
        emailPollingEnabled: false,
        emailEnabled: false,
      });
    });

    it("should return unavailable status when fetch throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { req, res } = createMockReqRes({});
      const next = vi.fn();
      const handler = getRouteHandler("GET", "/health");

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: "unavailable",
        emailPollingEnabled: false,
        emailEnabled: false,
      });
    });
  });

  describe("GET /current", () => {
    it("should return current reservations", async () => {
      const reservations = [
        { id: "res-1", date: "2024-01-15", startTime: "10:00am", players: ["Alice", "Bob"] },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(reservations),
      });

      const { req, res } = createMockReqRes({});
      const next = vi.fn();
      const handler = getRouteHandler("GET", "/current");

      await handler(req, res, next);

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:3002/api/reservations/current");
      expect(res.json).toHaveBeenCalledWith(reservations);
    });

    it("should return 503 when email service fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { req, res } = createMockReqRes({});
      const next = vi.fn();
      const handler = getRouteHandler("GET", "/current");

      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch reservations from email parser service",
      });
    });

    it("should return 503 when fetch throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const { req, res } = createMockReqRes({});
      const next = vi.fn();
      const handler = getRouteHandler("GET", "/current");

      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch reservations from email parser service",
      });
    });
  });

  describe("GET /today", () => {
    it("should return today's reservations", async () => {
      const reservations = [
        { id: "res-1", date: "2024-01-15", startTime: "10:00am", players: ["Alice", "Bob"] },
        { id: "res-2", date: "2024-01-15", startTime: "2:00pm", players: ["Charlie", "Dave"] },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(reservations),
      });

      const { req, res } = createMockReqRes({});
      const next = vi.fn();
      const handler = getRouteHandler("GET", "/today");

      await handler(req, res, next);

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:3002/api/reservations/today");
      expect(res.json).toHaveBeenCalledWith(reservations);
    });

    it("should return 503 when email service fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const { req, res } = createMockReqRes({});
      const next = vi.fn();
      const handler = getRouteHandler("GET", "/today");

      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  describe("GET /", () => {
    it("should return all reservations", async () => {
      const reservations = [
        { id: "res-1", date: "2024-01-15", startTime: "10:00am", players: ["Alice"] },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(reservations),
      });

      const { req, res } = createMockReqRes({ query: {} });
      const next = vi.fn();
      const handler = getRouteHandler("GET", "/");

      await handler(req, res, next);

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:3002/api/reservations?");
      expect(res.json).toHaveBeenCalledWith(reservations);
    });

    it("should pass query parameters to email parser", async () => {
      const reservations: unknown[] = [];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(reservations),
      });

      const { req, res } = createMockReqRes({
        query: { date: "2024-01-15", startTime: "10:00am" },
      });
      const next = vi.fn();
      const handler = getRouteHandler("GET", "/");

      await handler(req, res, next);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3002/api/reservations?date=2024-01-15&startTime=10%3A00am"
      );
      expect(res.json).toHaveBeenCalledWith(reservations);
    });

    it("should return 503 when email service fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Service unavailable"));

      const { req, res } = createMockReqRes({ query: {} });
      const next = vi.fn();
      const handler = getRouteHandler("GET", "/");

      await handler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch reservations from email parser service",
      });
    });
  });
});
