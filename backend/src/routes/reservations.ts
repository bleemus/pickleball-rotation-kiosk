import { Router, Request, Response } from "express";

const router = Router();

const EMAIL_PARSER_URL = process.env.EMAIL_PARSER_URL || "http://localhost:3002";

/**
 * GET /api/reservations/health
 * Check if email service is available and enabled
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${EMAIL_PARSER_URL}/health`);

    if (!response.ok) {
      throw new Error(`Email parser service returned ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error checking email service health:", error);
    res.json({ status: "unavailable", emailPollingEnabled: false, emailEnabled: false });
  }
});

/**
 * GET /api/reservations/current
 * Get reservations for the current time
 */
router.get("/current", async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${EMAIL_PARSER_URL}/api/reservations/current`);

    if (!response.ok) {
      throw new Error(`Email parser service returned ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching current reservations:", error);
    res.status(503).json({ error: "Failed to fetch reservations from email parser service" });
  }
});

/**
 * GET /api/reservations/today
 * Get all reservations for today
 */
router.get("/today", async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${EMAIL_PARSER_URL}/api/reservations/today`);

    if (!response.ok) {
      throw new Error(`Email parser service returned ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching today's reservations:", error);
    res.status(503).json({ error: "Failed to fetch reservations from email parser service" });
  }
});

/**
 * GET /api/reservations
 * Get all reservations or query by parameters
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const url = `${EMAIL_PARSER_URL}/api/reservations?${queryParams.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Email parser service returned ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(503).json({ error: "Failed to fetch reservations from email parser service" });
  }
});

export default router;
