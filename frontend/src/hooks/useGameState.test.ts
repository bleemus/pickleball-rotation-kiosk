import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGameState } from "./useGameState";
import { GameState } from "../types/game";
import { mockSession } from "../test/mocks/mockData";

describe("useGameState", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("initializes with default state", () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.session).toBeNull();
      expect(result.current.gameState).toBe(GameState.SETUP);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(true);
    });

    it("checks localStorage for saved session ID on mount", () => {
      localStorage.setItem("pickleballSessionId", "session-123");

      const { result } = renderHook(() => useGameState());

      // Hook should check localStorage (verified by getSavedSessionId)
      expect(result.current.getSavedSessionId()).toBe("session-123");
    });
  });

  describe("setSession", () => {
    it("updates session state", () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setSession(mockSession);
      });

      expect(result.current.session).toEqual(mockSession);
    });

    it("saves session ID to localStorage", () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setSession(mockSession);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith("pickleballSessionId", mockSession.id);
      expect(result.current.getSavedSessionId()).toBe(mockSession.id);
    });

    it("updates to new session when called multiple times", () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setSession(mockSession);
      });

      const newSession = { ...mockSession, id: "new-session-id" };

      act(() => {
        result.current.setSession(newSession);
      });

      expect(result.current.session).toEqual(newSession);
      expect(result.current.getSavedSessionId()).toBe("new-session-id");
    });
  });

  describe("setGameState", () => {
    it("updates game state", () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setGameState(GameState.PLAYING);
      });

      expect(result.current.gameState).toBe(GameState.PLAYING);
    });

    it("can transition through all game states", () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setGameState(GameState.PLAYING);
      });
      expect(result.current.gameState).toBe(GameState.PLAYING);

      act(() => {
        result.current.setGameState(GameState.SCORING);
      });
      expect(result.current.gameState).toBe(GameState.SCORING);

      act(() => {
        result.current.setGameState(GameState.HISTORY);
      });
      expect(result.current.gameState).toBe(GameState.HISTORY);

      act(() => {
        result.current.setGameState(GameState.SETUP);
      });
      expect(result.current.gameState).toBe(GameState.SETUP);
    });
  });

  describe("setError", () => {
    it("sets error message", () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setError("Test error message");
      });

      expect(result.current.error).toBe("Test error message");
    });

    it("sets loading to false when error is set", () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setLoading(true);
      });

      act(() => {
        result.current.setError("Error occurred");
      });

      expect(result.current.error).toBe("Error occurred");
      expect(result.current.loading).toBe(false);
    });

    it("clears error when set to null", () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setError("Some error");
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("setLoading", () => {
    it("sets loading state to true", () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it("sets loading state to false", () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("reset", () => {
    it("resets all state to initial values", () => {
      const { result } = renderHook(() => useGameState());

      // Set various state values
      act(() => {
        result.current.setSession(mockSession);
        result.current.setGameState(GameState.PLAYING);
        result.current.setError("Some error");
        result.current.setLoading(false);
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.gameState).toBe(GameState.SETUP);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(true);
    });

    it("removes session ID from localStorage", () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setSession(mockSession);
      });

      expect(result.current.getSavedSessionId()).toBe(mockSession.id);

      act(() => {
        result.current.reset();
      });

      expect(result.current.getSavedSessionId()).toBeNull();
    });
  });

  describe("getSavedSessionId", () => {
    it("returns null when no session ID is saved", () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.getSavedSessionId()).toBeNull();
    });

    it("returns saved session ID from localStorage", () => {
      localStorage.setItem("pickleballSessionId", "test-session-id");

      const { result } = renderHook(() => useGameState());

      expect(result.current.getSavedSessionId()).toBe("test-session-id");
    });
  });

  describe("Complex State Transitions", () => {
    it("handles full game flow state transitions", () => {
      const { result } = renderHook(() => useGameState());

      // Start: SETUP state
      expect(result.current.gameState).toBe(GameState.SETUP);

      // Create session
      act(() => {
        result.current.setSession(mockSession);
        result.current.setGameState(GameState.PLAYING);
        result.current.setLoading(false);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.gameState).toBe(GameState.PLAYING);
      expect(result.current.loading).toBe(false);

      // Enter scoring mode
      act(() => {
        result.current.setGameState(GameState.SCORING);
      });

      expect(result.current.gameState).toBe(GameState.SCORING);

      // Return to playing after scoring
      act(() => {
        result.current.setGameState(GameState.PLAYING);
      });

      expect(result.current.gameState).toBe(GameState.PLAYING);

      // View history
      act(() => {
        result.current.setGameState(GameState.HISTORY);
      });

      expect(result.current.gameState).toBe(GameState.HISTORY);

      // Reset game
      act(() => {
        result.current.reset();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.gameState).toBe(GameState.SETUP);
    });

    it("handles error state during gameplay", () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setSession(mockSession);
        result.current.setGameState(GameState.PLAYING);
      });

      // Error occurs
      act(() => {
        result.current.setError("Network error");
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.loading).toBe(false);
      expect(result.current.session).toEqual(mockSession); // Session persists
      expect(result.current.gameState).toBe(GameState.PLAYING); // Game state persists

      // Clear error
      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("LocalStorage Integration", () => {
    it("persists session across hook re-renders", () => {
      const { result, rerender } = renderHook(() => useGameState());

      act(() => {
        result.current.setSession(mockSession);
      });

      // Rerender hook
      rerender();

      // Session ID should still be in localStorage
      expect(result.current.getSavedSessionId()).toBe(mockSession.id);
    });

    it("maintains localStorage integrity after multiple operations", () => {
      const { result } = renderHook(() => useGameState());

      // Set first session
      act(() => {
        result.current.setSession(mockSession);
      });
      expect(result.current.getSavedSessionId()).toBe(mockSession.id);

      // Update to new session
      const newSession = { ...mockSession, id: "new-id" };
      act(() => {
        result.current.setSession(newSession);
      });
      expect(result.current.getSavedSessionId()).toBe("new-id");

      // Reset
      act(() => {
        result.current.reset();
      });
      expect(result.current.getSavedSessionId()).toBeNull();
    });
  });
});
