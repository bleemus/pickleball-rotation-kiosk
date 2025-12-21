import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useApi } from "./useApi";
import { http, HttpResponse } from "msw";
import { server } from "../test/mocks/server";
import { mockSession, mockPlayers, mockRound, mockGameHistory } from "../test/mocks/mockData";

describe("useApi", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe("Session Management", () => {
    it("createSession makes POST request with player names", async () => {
      const { result } = renderHook(() => useApi());

      const playerNames = ["Alice", "Bob", "Charlie", "Dave"];
      const session = await result.current.createSession(playerNames, 2);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.numCourts).toBe(2);
    });

    it("createSession defaults to 2 courts if not specified", async () => {
      const { result } = renderHook(() => useApi());

      const playerNames = ["Alice", "Bob", "Charlie", "Dave"];
      const session = await result.current.createSession(playerNames);

      expect(session.numCourts).toBe(2);
    });

    it("getSession retrieves session by ID", async () => {
      const { result } = renderHook(() => useApi());

      const session = await result.current.getSession("session-123");

      expect(session).toBeDefined();
      expect(session.id).toBe(mockSession.id);
    });

    it("getActiveSession returns active session", async () => {
      // Override default handler to return active session
      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json(mockSession);
        })
      );

      const { result } = renderHook(() => useApi());

      const session = await result.current.getActiveSession();

      expect(session).toBeDefined();
      expect(session?.id).toBe(mockSession.id);
    });

    it("getActiveSession returns null when no active session", async () => {
      // Explicitly ensure we use the default handler that returns 404
      server.use(
        http.get("/api/session/active", () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      const { result } = renderHook(() => useApi());

      const session = await result.current.getActiveSession();

      expect(session).toBeNull();
    });

    it("deleteSession deletes session by ID", async () => {
      const { result } = renderHook(() => useApi());

      await expect(result.current.deleteSession("session-123")).resolves.not.toThrow();
    });

    it("endSession marks session as ended", async () => {
      server.use(
        http.post("/api/session/:id/end", () => {
          return HttpResponse.json({ ...mockSession, ended: true });
        })
      );

      const { result } = renderHook(() => useApi());

      const session = await result.current.endSession("session-123");

      expect(session.ended).toBe(true);
    });

    it("updateNumCourts updates court count", async () => {
      server.use(
        http.patch("/api/session/:id/courts", async ({ request }) => {
          const body = (await request.json()) as { numCourts: number };
          return HttpResponse.json({ ...mockSession, numCourts: body.numCourts });
        })
      );

      const { result } = renderHook(() => useApi());

      const session = await result.current.updateNumCourts("session-123", 3);

      expect(session.numCourts).toBe(3);
    });
  });

  describe("Player Management", () => {
    it("addPlayer adds new player to session", async () => {
      const { result } = renderHook(() => useApi());

      const session = await result.current.addPlayer("session-123", "NewPlayer");

      expect(session).toBeDefined();
      expect(session.players.length).toBeGreaterThan(mockSession.players.length);
    });

    it("removePlayer removes player from session", async () => {
      const { result } = renderHook(() => useApi());

      const session = await result.current.removePlayer("session-123", "player-1");

      expect(session).toBeDefined();
    });

    it("getPlayers returns all players", async () => {
      const { result } = renderHook(() => useApi());

      const players = await result.current.getPlayers("session-123");

      expect(players).toEqual(mockPlayers);
    });

    it("togglePlayerSitOut toggles sit-out status", async () => {
      const { result } = renderHook(() => useApi());

      const session = await result.current.togglePlayerSitOut("session-123", "player-1");

      expect(session).toBeDefined();
    });
  });

  describe("Round Management", () => {
    it("startNextRound creates new round", async () => {
      const { result } = renderHook(() => useApi());

      const session = await result.current.startNextRound("session-123");

      expect(session).toBeDefined();
      expect(session.currentRound).toBeDefined();
    });

    it("cancelCurrentRound removes current round", async () => {
      server.use(
        http.delete("/api/session/:id/round", () => {
          return HttpResponse.json({ ...mockSession, currentRound: null });
        })
      );

      const { result } = renderHook(() => useApi());

      const session = await result.current.cancelCurrentRound("session-123");

      expect(session.currentRound).toBeNull();
    });

    it("getCurrentRound retrieves current round", async () => {
      const { result } = renderHook(() => useApi());

      const round = await result.current.getCurrentRound("session-123");

      expect(round).toEqual(mockRound);
    });

    it("completeRound submits scores", async () => {
      const { result } = renderHook(() => useApi());

      const scores = [
        { matchId: "match-1", team1Score: 11, team2Score: 9 },
        { matchId: "match-2", team1Score: 11, team2Score: 7 },
      ];

      const session = await result.current.completeRound("session-123", scores);

      expect(session).toBeDefined();
    });
  });

  describe("Game History", () => {
    it("getGameHistory returns game history", async () => {
      const { result } = renderHook(() => useApi());

      const history = await result.current.getGameHistory("session-123");

      expect(history).toEqual(mockGameHistory);
    });
  });

  describe("Error Handling", () => {
    it("throws error when createSession fails", async () => {
      server.use(
        http.post("/api/session", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useApi());

      await expect(result.current.createSession(["Alice"])).rejects.toThrow();
    });

    it("throws error with message from API", async () => {
      server.use(
        http.post("/api/session", () => {
          return HttpResponse.json({ error: "Custom error message" }, { status: 400 });
        })
      );

      const { result } = renderHook(() => useApi());

      await expect(result.current.createSession(["Alice"])).rejects.toThrow("Custom error message");
    });

    it("handles non-JSON error responses", async () => {
      server.use(
        http.post("/api/session", () => {
          return new HttpResponse("Internal Server Error", { status: 500 });
        })
      );

      const { result } = renderHook(() => useApi());

      await expect(result.current.createSession(["Alice"])).rejects.toThrow();
    });

    it("handles network errors", async () => {
      server.use(
        http.post("/api/session", () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useApi());

      await expect(result.current.createSession(["Alice"])).rejects.toThrow();
    });

    it("throws error when getSession fails", async () => {
      server.use(
        http.get("/api/session/:id", () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      const { result } = renderHook(() => useApi());

      await expect(result.current.getSession("invalid-id")).rejects.toThrow();
    });

    it("throws error when deleteSession fails", async () => {
      server.use(
        http.delete("/api/session/:id", () => {
          return HttpResponse.json({ error: "Cannot delete session" }, { status: 400 });
        })
      );

      const { result } = renderHook(() => useApi());

      await expect(result.current.deleteSession("session-123")).rejects.toThrow(
        "Cannot delete session"
      );
    });

    it("throws error when addPlayer fails", async () => {
      server.use(
        http.post("/api/session/:id/players", () => {
          return HttpResponse.json({ error: "Player already exists" }, { status: 400 });
        })
      );

      const { result } = renderHook(() => useApi());

      await expect(result.current.addPlayer("session-123", "Alice")).rejects.toThrow(
        "Player already exists"
      );
    });

    it("throws error when completeRound fails", async () => {
      server.use(
        http.post("/api/session/:id/round/complete", () => {
          return HttpResponse.json({ error: "Invalid scores" }, { status: 400 });
        })
      );

      const { result } = renderHook(() => useApi());

      await expect(result.current.completeRound("session-123", [])).rejects.toThrow(
        "Invalid scores"
      );
    });
  });

  describe("API Call Parameters", () => {
    it("sends correct request body for createSession", async () => {
      let receivedBody: any;

      server.use(
        http.post("/api/session", async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json(mockSession);
        })
      );

      const { result } = renderHook(() => useApi());

      await result.current.createSession(["Alice", "Bob"], 3);

      expect(receivedBody).toEqual({
        playerNames: ["Alice", "Bob"],
        numCourts: 3,
      });
    });

    it("sends correct request body for addPlayer", async () => {
      let receivedBody: any;

      server.use(
        http.post("/api/session/:id/players", async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json(mockSession);
        })
      );

      const { result } = renderHook(() => useApi());

      await result.current.addPlayer("session-123", "Charlie");

      expect(receivedBody).toEqual({ name: "Charlie" });
    });

    it("sends correct request body for completeRound", async () => {
      let receivedBody: any;

      server.use(
        http.post("/api/session/:id/round/complete", async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json(mockSession);
        })
      );

      const { result } = renderHook(() => useApi());

      const scores = [{ matchId: "match-1", team1Score: 11, team2Score: 9 }];

      await result.current.completeRound("session-123", scores);

      expect(receivedBody).toEqual({ scores });
    });
  });
});
