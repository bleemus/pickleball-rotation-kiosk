import { Router, Request, Response } from "express";
import { networkInterfaces } from "os";
import {
  createSession,
  getSessionById,
  getActiveSession,
  addPlayer,
  removePlayer,
  renamePlayer,
  togglePlayerSitOut,
  updateNumCourts,
  startNextRound,
  cancelCurrentRound,
  completeCurrentRound,
  getCurrentRound,
  getGameHistory,
  deleteSessionById,
  endSession,
} from "../services/gameService";
import {
  CreateSessionRequest,
  AddPlayerRequest,
  RenamePlayerRequest,
  CompleteRoundRequest,
} from "../types/game";
import { flushAllSessions } from "../services/redis";

const router = Router();

// Helper function to get the server's local network IP
function getLocalNetworkIP(): string | null {
  const nets = networkInterfaces();
  const candidates: string[] = [];

  // Skip virtual/docker interfaces
  const skipInterfaces = ["docker", "veth", "virbr", "vmnet", "vboxnet", "br-"];

  for (const name of Object.keys(nets)) {
    // Skip virtual interfaces
    if (skipInterfaces.some((skip) => name.toLowerCase().startsWith(skip))) {
      continue;
    }

    const netList = nets[name];
    if (!netList) continue;

    for (const net of netList) {
      // Skip internal (loopback), non-IPv4, and link-local addresses
      if (net.family === "IPv4" && !net.internal && !net.address.startsWith("169.254.")) {
        candidates.push(net.address);
      }
    }
  }

  // Prioritize common private network ranges
  // 1. 192.168.x.x (most common home/office networks)
  // 2. 10.x.x.x (common corporate networks)
  // 3. 172.16-31.x.x (less common private range)
  const preferred =
    candidates.find((ip) => ip.startsWith("192.168.")) ||
    candidates.find((ip) => ip.startsWith("10.")) ||
    candidates.find((ip) => {
      const second = parseInt(ip.split(".")[1]);
      return ip.startsWith("172.") && second >= 16 && second <= 31;
    }) ||
    candidates[0]; // Fallback to first candidate

  return preferred || null;
}

// Get server network info
router.get("/network-info", (req: Request, res: Response) => {
  const nets = networkInterfaces();
  const allIPs: { interface: string; ip: string }[] = [];

  // Collect all non-internal IPv4 addresses for debugging
  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;

    for (const net of netList) {
      if (net.family === "IPv4" && !net.internal) {
        allIPs.push({ interface: name, ip: net.address });
      }
    }
  }

  // Use HOST_IP from environment if available (set by docker-compose for host machine IP)
  // Otherwise fall back to detection logic (for non-Docker environments)
  const networkIP = process.env.HOST_IP || getLocalNetworkIP();
  const hostname = require("os").hostname();

  res.json({
    hostname,
    ip: networkIP,
    port: process.env.PORT || 3001,
    allIPs, // For debugging
  });
});

// Get WiFi credentials (from environment configuration)
router.get("/wifi-info", (req: Request, res: Response) => {
  const ssid = process.env.WIFI_SSID;
  const password = process.env.WIFI_PASSWORD;

  if (!ssid) {
    res.status(404).json({
      error: "WiFi not configured. Set WIFI_SSID and WIFI_PASSWORD environment variables.",
    });
    return;
  }

  // Return SSID and password (if configured)
  const response: { ssid: string; password?: string } = { ssid };
  if (password) {
    response.password = password;
  }

  res.json(response);
});

// Test cleanup endpoint - flush all Redis session data (development/test only)
router.post("/test/cleanup", async (req: Request, res: Response) => {
  // Only allow in development or test environments
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Test cleanup endpoint disabled in production" });
    return;
  }

  try {
    await flushAllSessions();
    res.json({ message: "All session data flushed from Redis" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

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
router.delete("/session/:id/players/:playerId", async (req: Request, res: Response) => {
  try {
    const session = await removePlayer(req.params.id, req.params.playerId);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Rename player in session
router.patch("/session/:id/players/:playerId/rename", async (req: Request, res: Response) => {
  try {
    const request: RenamePlayerRequest = req.body;
    const session = await renamePlayer(req.params.id, req.params.playerId, request);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

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
router.patch("/session/:id/players/:playerId/sitout", async (req: Request, res: Response) => {
  try {
    const session = await togglePlayerSitOut(req.params.id, req.params.playerId);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

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
router.get("/session/:id/round/current", async (req: Request, res: Response) => {
  try {
    const round = await getCurrentRound(req.params.id);
    res.json(round);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

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
router.post("/session/:id/round/complete", async (req: Request, res: Response) => {
  try {
    const request: CompleteRoundRequest = req.body;
    const session = await completeCurrentRound(req.params.id, request);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Get game history
router.get("/session/:id/history", async (req: Request, res: Response) => {
  try {
    const history = await getGameHistory(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// End session
router.post("/session/:id/end", async (req: Request, res: Response) => {
  try {
    const session = await endSession(req.params.id);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
