import { Router, Request, Response } from "express";
import {
  createSession,
  getSessionById,
  getActiveSession,
  addPlayer,
  removePlayer,
  togglePlayerSitOut,
  updateNumCourts,
  startNextRound,
  cancelCurrentRound,
  completeCurrentRound,
  getCurrentRound,
  getGameHistory,
  deleteSessionById,
} from "../services/gameService";
import {
  CreateSessionRequest,
  AddPlayerRequest,
  CompleteRoundRequest,
} from "../types/game";

const router = Router();

// Get active session
router.get("/session/active", async (req: Request, res: Response) => {
  try {
    const session = await getActiveSession();
    if (!session) {
      res.status(404).json({ error: "No active session" });
      return;
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create a new session
router.post("/session", async (req: Request, res: Response) => {
  try {
    const request: CreateSessionRequest = req.body;
    const session = await createSession(request);
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Get session by ID
router.get("/session/:id", async (req: Request, res: Response) => {
  try {
    const session = await getSessionById(req.params.id);
    res.json(session);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// Update number of courts
router.patch("/session/:id/courts", async (req: Request, res: Response) => {
  try {
    const { numCourts } = req.body;
    const session = await updateNumCourts(req.params.id, numCourts);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Delete session
router.delete("/session/:id", async (req: Request, res: Response) => {
  try {
    await deleteSessionById(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// Add player to session
router.post("/session/:id/players", async (req: Request, res: Response) => {
  try {
    const request: AddPlayerRequest = req.body;
    const session = await addPlayer(req.params.id, request);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Remove player from session
router.delete(
  "/session/:id/players/:playerId",
  async (req: Request, res: Response) => {
    try {
      const session = await removePlayer(req.params.id, req.params.playerId);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  },
);

// Get all players in session
router.get("/session/:id/players", async (req: Request, res: Response) => {
  try {
    const session = await getSessionById(req.params.id);
    res.json(session.players);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// Toggle player sit out for next round
router.patch(
  "/session/:id/players/:playerId/sitout",
  async (req: Request, res: Response) => {
    try {
      const session = await togglePlayerSitOut(
        req.params.id,
        req.params.playerId,
      );
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  },
);

// Start next round
router.post("/session/:id/round", async (req: Request, res: Response) => {
  try {
    const session = await startNextRound(req.params.id);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Get current round
router.get(
  "/session/:id/round/current",
  async (req: Request, res: Response) => {
    try {
      const round = await getCurrentRound(req.params.id);
      res.json(round);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  },
);

// Cancel current round
router.delete("/session/:id/round", async (req: Request, res: Response) => {
  try {
    const session = await cancelCurrentRound(req.params.id);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Complete current round with scores
router.post(
  "/session/:id/round/complete",
  async (req: Request, res: Response) => {
    try {
      const request: CompleteRoundRequest = req.body;
      const session = await completeCurrentRound(req.params.id, request);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  },
);

// Get game history
router.get("/session/:id/history", async (req: Request, res: Response) => {
  try {
    const history = await getGameHistory(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

export default router;
