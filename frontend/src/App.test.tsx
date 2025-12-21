import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { http, HttpResponse } from "msw";
import { server } from "./test/mocks/server";
import {
  mockSession,
  mockRound,
  mockSessionWithRound,
  mockGameHistory,
  mockEndedSession,
} from "./test/mocks/mockData";

describe("App Integration Tests", () => {
  beforeEach(() => {
    server.resetHandlers();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Initial Session Loading", () => {
    it("shows loading screen on initial mount", () => {
      render(<App />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("loads session from localStorage on mount", async () => {
      localStorage.setItem("pickleballSessionId", "session-123");

      server.use(
        http.get("/api/session/:id", () => {
          return HttpResponse.json({
            ...mockSession,
            id: "session-123",
            gameHistory: mockGameHistory,
          });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Should show playing view since session has game history
      const playerStatsElements = screen.getAllByText("Player Stats");
      expect(playerStatsElements.length).toBeGreaterThan(0);
    });

    it("loads active session when no saved session ID exists", async () => {
      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json(mockSession);
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });
    });

    it("shows setup screen when no session exists", async () => {
      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json(null, { status: 404 });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText("Enter player name")).toBeInTheDocument();
    });
  });

  describe("State Transitions", () => {
    it("transitions from SETUP to PLAYING when starting game", async () => {
      const user = userEvent.setup();

      server.use(
        http.post("/api/session", () => {
          return HttpResponse.json(mockSession);
        }),
        http.post("/api/session/:id/round", () => {
          return HttpResponse.json({
            ...mockSession,
            currentRound: mockRound,
          });
        }),
        http.get("/api/session/active", () => {
          return HttpResponse.json(null, { status: 404 });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Add players
      const input = screen.getByPlaceholderText("Enter player name");
      const addButton = screen.getByText("Add");

      for (const name of ["Alice", "Bob", "Charlie", "Dave", "Eve", "Frank", "Grace", "Henry"]) {
        await user.type(input, name);
        await user.click(addButton);
      }

      // Start game
      const startButton = screen.getByText("Start Game");
      await user.click(startButton);

      // Should transition to playing view
      await waitFor(() => {
        expect(screen.getByText("Round 1")).toBeInTheDocument();
      });
    });

    it("transitions from PLAYING to SCORING when entering scores", async () => {
      const user = userEvent.setup();

      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json({
            ...mockSession,
            currentRound: mockRound,
          });
        }),
        http.get("/api/session/:id", () => {
          return HttpResponse.json({
            ...mockSession,
            currentRound: mockRound,
          });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const enterScoresButton = await screen.findByText("Enter Scores");
      await user.click(enterScoresButton);

      // Should show score entry form
      await waitFor(() => {
        expect(screen.getByText("Submit Scores")).toBeInTheDocument();
      });
    });

    it("transitions from SCORING to PLAYING when canceling score entry", async () => {
      const user = userEvent.setup();

      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json({
            ...mockSession,
            currentRound: mockRound,
          });
        }),
        http.get("/api/session/:id", () => {
          return HttpResponse.json({
            ...mockSession,
            currentRound: mockRound,
          });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Enter scoring mode
      const enterScoresButton = await screen.findByText("Enter Scores");
      await user.click(enterScoresButton);

      await waitFor(() => {
        expect(screen.getByText("Submit Scores")).toBeInTheDocument();
      });

      // Cancel
      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      // Should return to matchups view
      await waitFor(() => {
        expect(screen.queryByText("Submit Scores")).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("displays error screen when API call fails", async () => {
      const user = userEvent.setup();

      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json(null, { status: 404 });
        }),
        http.post("/api/session", () => {
          return HttpResponse.json({ error: "Failed to create session" }, { status: 500 });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Add players
      const input = screen.getByPlaceholderText("Enter player name");
      const addButton = screen.getByText("Add");

      for (const name of ["Alice", "Bob", "Charlie", "Dave", "Eve", "Frank", "Grace", "Henry"]) {
        await user.type(input, name);
        await user.click(addButton);
      }

      // Try to start game
      const startButton = screen.getByText("Start Game");
      await user.click(startButton);

      // Should show error
      await waitFor(
        () => {
          expect(screen.getByText("Error")).toBeInTheDocument();
          expect(screen.getByText("Failed to create session")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it("clears error when OK button is clicked", async () => {
      const user = userEvent.setup();

      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json(null, { status: 404 });
        }),
        http.post("/api/session", () => {
          return HttpResponse.json({ error: "Test error" }, { status: 500 });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Add players
      const input = screen.getByPlaceholderText("Enter player name");
      const addButton = screen.getByText("Add");

      for (const name of ["Alice", "Bob", "Charlie", "Dave", "Eve", "Frank", "Grace", "Henry"]) {
        await user.type(input, name);
        await user.click(addButton);
      }

      // Try to start game
      const startButton = screen.getByText("Start Game");
      await user.click(startButton);

      await waitFor(
        () => {
          expect(screen.getByText("Test error")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Click OK
      const okButton = screen.getByText("OK");
      await user.click(okButton);

      // Should return to setup screen
      await waitFor(() => {
        expect(screen.queryByText("Test error")).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText("Enter player name")).toBeInTheDocument();
      });
    });
  });

  describe("Player Management", () => {
    it("adds players to temporary list before session is created", async () => {
      const user = userEvent.setup();

      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json(null, { status: 404 });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Enter player name");
      const addButton = screen.getByText("Add");

      await user.type(input, "Alice");
      await user.click(addButton);

      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    it("removes players from temporary list before session is created", async () => {
      const user = userEvent.setup();

      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json(null, { status: 404 });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("Enter player name");
      const addButton = screen.getByText("Add");

      await user.type(input, "Alice");
      await user.click(addButton);

      // Wait for Alice to appear
      await waitFor(() => {
        expect(screen.getByText("Alice")).toBeInTheDocument();
      });

      // Find Alice's parent container and then the remove button within it
      const aliceElement = screen.getByText("Alice");
      const aliceContainer = aliceElement.closest("div");
      if (aliceContainer) {
        const removeButton = aliceContainer.querySelector("button");
        if (removeButton) {
          await user.click(removeButton);
        }
      }

      await waitFor(() => {
        expect(screen.queryByText("Alice")).not.toBeInTheDocument();
      });
    });
  });

  describe("View Rendering", () => {
    it("renders PlayerSetup when no session exists", async () => {
      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json(null, { status: 404 });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter player name")).toBeInTheDocument();
      });
    });

    it("renders CurrentMatchups when round is active", async () => {
      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json({
            ...mockSession,
            currentRound: mockRound,
          });
        }),
        http.get("/api/session/:id", () => {
          return HttpResponse.json({
            ...mockSession,
            currentRound: mockRound,
          });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Round 1")).toBeInTheDocument();
      });
    });

    it("renders PlayerManager when session exists but no active round", async () => {
      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json({
            ...mockSession,
            currentRound: null,
            gameHistory: mockGameHistory,
          });
        }),
        http.get("/api/session/:id", () => {
          return HttpResponse.json({
            ...mockSession,
            currentRound: null,
            gameHistory: mockGameHistory,
          });
        })
      );

      render(<App />);

      await waitFor(
        () => {
          expect(screen.getByText("Manage Players")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it("renders SessionSummary when session has ended", async () => {
      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json(mockEndedSession);
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Session Complete!/)).toBeInTheDocument();
      });
    });

    it("renders ScoreHistory when history view is requested", async () => {
      const user = userEvent.setup();

      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json({
            ...mockSession,
            currentRound: mockRound,
            gameHistory: mockGameHistory,
          });
        }),
        http.get("/api/session/:id", () => {
          return HttpResponse.json({
            ...mockSession,
            currentRound: mockRound,
            gameHistory: mockGameHistory,
          });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Round 1")).toBeInTheDocument();
      });

      // Click "View History" button
      const historyButton = screen.getByText("View History");
      await user.click(historyButton);

      // Should show history view
      await waitFor(() => {
        expect(screen.getByText("Game History")).toBeInTheDocument();
      });
    });
  });

  describe("Session Reset", () => {
    it("resets session when user confirms", async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => true);

      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json(mockSessionWithRound);
        }),
        http.get("/api/session/:id", () => {
          return HttpResponse.json(mockSessionWithRound);
        }),
        http.delete("/api/session/:id", () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Find and click reset button
      const resetButtons = screen.getAllByText("Reset");
      await user.click(resetButtons[0]);

      // Should show setup screen
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter player name")).toBeInTheDocument();
      });
    });

    it("does not reset session when user cancels", async () => {
      const user = userEvent.setup();
      window.confirm = vi.fn(() => false);

      // Set localStorage so the app loads the session by ID
      localStorage.setItem("pickleballSessionId", mockSessionWithRound.id);

      server.use(
        http.get("/api/session/active", () => {
          return HttpResponse.json(mockSessionWithRound);
        }),
        http.get("/api/session/:id", () => {
          return HttpResponse.json(mockSessionWithRound);
        })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Verify we're in the playing state with a current round
      await waitFor(() => {
        expect(screen.getByText("Round 1")).toBeInTheDocument();
      });

      // Find and click reset button
      const resetButtons = screen.getAllByText("Reset");
      await user.click(resetButtons[0]);

      // Should stay on current screen
      await waitFor(() => {
        expect(screen.getByText("Round 1")).toBeInTheDocument();
      });
    });
  });
});
