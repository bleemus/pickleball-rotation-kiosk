import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useReservations } from "./useReservations";

// Declare fetch mock type
const mockFetch = vi.fn();

describe("useReservations", () => {
  const mockReservations = [
    {
      id: "res-1",
      date: "2024-01-15",
      startTime: "10:00am",
      endTime: "12:00pm",
      court: "Court 1",
      players: ["Alice", "Bob"],
      createdAt: "2024-01-15T08:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("Initial Fetch", () => {
    it("fetches reservations on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReservations),
      });

      const { result } = renderHook(() => useReservations());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3002/api/reservations",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      expect(result.current.reservations).toEqual(mockReservations);
      expect(result.current.error).toBeNull();
    });

    it("handles fetch error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useReservations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Failed to fetch reservations");
      expect(result.current.reservations).toEqual([]);
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useReservations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.reservations).toEqual([]);
    });
  });

  describe("Polling", () => {
    it("sets up polling interval on mount", async () => {
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockReservations),
      });

      const { result, unmount } = renderHook(() => useReservations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have set up the interval
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 120000);

      unmount();
      setIntervalSpy.mockRestore();
    });

    it("clears interval on unmount", async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockReservations),
      });

      const { result, unmount } = renderHook(() => useReservations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      unmount();

      // Should have cleared the interval
      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });

  describe("Refetch", () => {
    it("provides refetch function", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockReservations),
      });

      const { result } = renderHook(() => useReservations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Unknown Error Handling", () => {
    it("handles non-Error thrown values", async () => {
      mockFetch.mockRejectedValueOnce("string error");

      const { result } = renderHook(() => useReservations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Unknown error");
    });
  });
});
