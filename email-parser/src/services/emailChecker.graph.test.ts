import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock external dependencies before importing the module
vi.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    initWithMiddleware: vi.fn(() => ({
      api: vi.fn(() => ({
        filter: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        top: vi.fn().mockReturnThis(),
        orderby: vi.fn().mockReturnThis(),
        get: vi.fn(),
        patch: vi.fn(),
      })),
    })),
  },
}));

vi.mock("@azure/identity", () => ({
  ClientSecretCredential: vi.fn().mockImplementation(() => ({
    getToken: vi.fn().mockResolvedValue({ token: "mock-token" }),
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { GraphEmailChecker } from "./emailChecker.graph.js";
import { Client } from "@microsoft/microsoft-graph-client";

describe("GraphEmailChecker", () => {
  const mockConfig = {
    tenantId: "test-tenant",
    clientId: "test-client",
    clientSecret: "test-secret",
    userId: "test@example.com",
    aiParserUrl: "https://test-function.azurewebsites.net/api/parse",
    aiParserKey: "test-api-key",
  };

  let mockOnReservationFound: ReturnType<typeof vi.fn>;
  let checker: GraphEmailChecker;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockGraphApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnReservationFound = vi.fn().mockResolvedValue(undefined);

    // Setup Graph API mock chain
    mockGraphApi = vi.fn(() => ({
      filter: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      top: vi.fn().mockReturnThis(),
      orderby: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ value: [] }),
      patch: vi.fn().mockResolvedValue(undefined),
    }));

    (Client.initWithMiddleware as ReturnType<typeof vi.fn>).mockReturnValue({
      api: mockGraphApi,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    checker = new GraphEmailChecker(mockConfig, mockOnReservationFound as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("creates instance with valid config", () => {
      expect(checker).toBeDefined();
    });

    it("initializes Graph client with middleware", () => {
      expect(Client.initWithMiddleware).toHaveBeenCalled();
    });
  });

  describe("checkEmails", () => {
    it("fetches unread messages from inbox", async () => {
      const mockGet = vi.fn().mockResolvedValue({ value: [] });
      mockGraphApi.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        top: vi.fn().mockReturnThis(),
        orderby: vi.fn().mockReturnThis(),
        get: mockGet,
        patch: vi.fn(),
      });

      await checker.checkEmails();

      expect(mockGraphApi).toHaveBeenCalledWith(
        `/users/${mockConfig.userId}/mailFolders/inbox/messages`
      );
    });

    it("processes messages and calls AI parser", async () => {
      const mockMessages = [
        {
          id: "msg-1",
          subject: "Pickleball Reservation",
          body: { content: "Reservation for tomorrow at 10am" },
          from: { emailAddress: { name: "John", address: "john@example.com" } },
        },
      ];

      const mockPatch = vi.fn().mockResolvedValue(undefined);
      const mockGet = vi.fn().mockResolvedValue({ value: mockMessages });

      mockGraphApi.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        top: vi.fn().mockReturnThis(),
        orderby: vi.fn().mockReturnThis(),
        get: mockGet,
        patch: mockPatch,
      });

      // Mock AI parser response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            is_reservation: true,
            date: "2024-01-15",
            start_time: "10:00am",
            end_time: "12:00pm",
            court: "Court 1",
            players: ["Alice", "Bob"],
          }),
      });

      await checker.checkEmails();

      // Should call AI parser
      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.aiParserUrl,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-functions-key": mockConfig.aiParserKey,
          }),
        })
      );

      // Should call onReservationFound
      expect(mockOnReservationFound).toHaveBeenCalled();
    });

    it("marks message as read after processing", async () => {
      const mockMessages = [
        {
          id: "msg-1",
          subject: "Test",
          body: { content: "Test content" },
          from: { emailAddress: { address: "test@example.com" } },
        },
      ];

      const mockPatch = vi.fn().mockResolvedValue(undefined);
      const mockGet = vi.fn().mockResolvedValue({ value: mockMessages });

      mockGraphApi.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        top: vi.fn().mockReturnThis(),
        orderby: vi.fn().mockReturnThis(),
        get: mockGet,
        patch: mockPatch,
      });

      // Mock AI parser to return no reservation
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ is_reservation: false }),
      });

      await checker.checkEmails();

      // Should mark message as read
      expect(mockGraphApi).toHaveBeenCalledWith(`/users/${mockConfig.userId}/messages/msg-1`);
    });

    it("handles empty inbox", async () => {
      mockGraphApi.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        top: vi.fn().mockReturnThis(),
        orderby: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ value: [] }),
        patch: vi.fn(),
      });

      await expect(checker.checkEmails()).resolves.not.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("continues processing other messages when one fails", async () => {
      const mockMessages = [
        {
          id: "msg-1",
          subject: "Test 1",
          body: { content: "Content 1" },
          from: { emailAddress: { address: "test1@example.com" } },
        },
        {
          id: "msg-2",
          subject: "Test 2",
          body: { content: "Content 2" },
          from: { emailAddress: { address: "test2@example.com" } },
        },
      ];

      const mockPatch = vi.fn().mockResolvedValue(undefined);
      const mockGet = vi.fn().mockResolvedValue({ value: mockMessages });

      mockGraphApi.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        top: vi.fn().mockReturnThis(),
        orderby: vi.fn().mockReturnThis(),
        get: mockGet,
        patch: mockPatch,
      });

      // First call fails, second succeeds
      mockFetch.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ is_reservation: false }),
      });

      await expect(checker.checkEmails()).resolves.not.toThrow();

      // Both messages should be processed (2 AI parser calls attempted)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("AI Parser Integration", () => {
    beforeEach(() => {
      const mockMessages = [
        {
          id: "msg-1",
          subject: "Reservation",
          body: { content: "Test reservation content" },
          from: { emailAddress: { address: "test@example.com" } },
        },
      ];

      mockGraphApi.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        top: vi.fn().mockReturnThis(),
        orderby: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ value: mockMessages }),
        patch: vi.fn().mockResolvedValue(undefined),
      });
    });

    it("handles AI parser returning non-reservation", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ is_reservation: false }),
      });

      await checker.checkEmails();

      expect(mockOnReservationFound).not.toHaveBeenCalled();
    });

    it("handles AI parser returning incomplete data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            is_reservation: true,
            date: "2024-01-15",
            // Missing start_time and players
          }),
      });

      await checker.checkEmails();

      expect(mockOnReservationFound).not.toHaveBeenCalled();
    });

    it("handles AI parser returning error status", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await checker.checkEmails();

      expect(mockOnReservationFound).not.toHaveBeenCalled();
    });

    it("handles AI parser network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(checker.checkEmails()).resolves.not.toThrow();
      expect(mockOnReservationFound).not.toHaveBeenCalled();
    });

    it("creates reservation with default values for missing fields", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            is_reservation: true,
            date: "2024-01-15",
            start_time: "10:00am",
            players: ["Alice"],
            // Missing end_time, court, organizer
          }),
      });

      await checker.checkEmails();

      expect(mockOnReservationFound).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: "10:00am",
          endTime: "10:00am", // Defaults to start_time
          court: "Unknown", // Default court
          organizer: "Alice", // Defaults to first player
          players: ["Alice"],
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("throws on Graph API errors", async () => {
      mockGraphApi.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        top: vi.fn().mockReturnThis(),
        orderby: vi.fn().mockReturnThis(),
        get: vi.fn().mockRejectedValue(new Error("Graph API error")),
        patch: vi.fn(),
      });

      await expect(checker.checkEmails()).rejects.toThrow("Graph API error");
    });
  });
});
