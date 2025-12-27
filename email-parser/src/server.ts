import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import { GraphEmailChecker } from "./services/emailChecker.graph.js";
import { ReservationStorage } from "./services/reservationStorage.redis.js";
import { Reservation } from "./types/reservation.js";
import { connectRedis } from "./services/redis.js";
import { initConfig, type EmailParserConfig } from "./services/keyVault.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize storage
const storage = new ReservationStorage();

// Initialize email checker - Microsoft Graph API only
// This will be set up after config is loaded in startServer()
let emailChecker: GraphEmailChecker | null = null;

// Check if email polling is enabled via feature flag
const emailPollingEnabled = process.env.ENABLE_EMAIL_POLLING !== "false";

/**
 * Initialize email checker with configuration from Key Vault or environment
 */
function initializeEmailChecker(config: EmailParserConfig): void {
  if (!emailPollingEnabled) {
    console.log("📧 Email polling disabled via ENABLE_EMAIL_POLLING=false");
    return;
  }

  // Check for Microsoft Graph API configuration
  if (
    config.graphTenantId &&
    config.graphClientId &&
    config.graphClientSecret &&
    config.graphUserId
  ) {
    emailChecker = new GraphEmailChecker(
      {
        tenantId: config.graphTenantId,
        clientId: config.graphClientId,
        clientSecret: config.graphClientSecret,
        userId: config.graphUserId,
      },
      async (reservation: Reservation) => {
        await storage.addReservation(reservation);
      }
    );
    console.log("✅ Using Microsoft Graph API for email checking");

    // Schedule email checks
    const checkInterval = parseInt(process.env.EMAIL_CHECK_INTERVAL || "5");
    cron.schedule(`*/${checkInterval} * * * *`, async () => {
      console.log("Checking for new reservation emails...");
      try {
        await emailChecker!.checkEmails();
      } catch (error) {
        console.error("Error checking emails:", error);
      }
    });

    console.log(`Email checking scheduled every ${checkInterval} minutes`);
    console.log("First email check will run at the next scheduled interval");
  } else {
    console.warn("⚠️  Email polling enabled but Graph API credentials not configured");
    console.warn(
      "Set secrets in Key Vault (graph-tenant-id, graph-client-id, graph-client-secret, graph-user-id)"
    );
    console.warn(
      "Or set environment variables: GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_USER_ID"
    );
  }
}

// Routes

/**
 * GET /health
 * Health check endpoint
 */
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    emailPollingEnabled: emailPollingEnabled,
    emailEnabled: emailChecker !== null,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/reservations
 * Get all reservations or filter by query params
 */
app.get("/api/reservations", async (req: Request, res: Response) => {
  // Return empty array if email service is not enabled/configured (feature disabled, not an error)
  if (!emailChecker) {
    res.json([]);
    return;
  }

  try {
    const { date, startTime, endTime } = req.query;

    if (date || startTime || endTime) {
      const results = await storage.queryReservations({
        date: date as string,
        startTime: startTime as string,
        endTime: endTime as string,
      });
      res.json(results);
    } else {
      const results = await storage.getAllReservations();
      res.json(results);
    }
  } catch (error) {
    console.error("Error querying reservations:", error);
    res.status(500).json({ error: "Failed to query reservations" });
  }
});

/**
 * GET /api/reservations/today
 * Get today's reservations
 */
app.get("/api/reservations/today", async (req: Request, res: Response) => {
  // Return empty array if email service is not enabled/configured (feature disabled, not an error)
  if (!emailChecker) {
    res.json([]);
    return;
  }

  try {
    const results = await storage.getTodayReservations();
    res.json(results);
  } catch (error) {
    console.error("Error getting today's reservations:", error);
    res.status(500).json({ error: "Failed to get today's reservations" });
  }
});

/**
 * GET /api/reservations/current
 * Get reservations matching current time (within 30 minutes)
 */
app.get("/api/reservations/current", async (req: Request, res: Response) => {
  // Return empty array if email service is not enabled/configured (feature disabled, not an error)
  if (!emailChecker) {
    res.json([]);
    return;
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayReservations = await storage.queryReservations({ date: todayStr });

    // Find reservations starting within the next 30 minutes or currently active
    const currentReservations = todayReservations.filter((reservation) => {
      const startTime = parseTime(reservation.startTime);
      const endTime = parseTime(reservation.endTime);

      if (!startTime || !endTime) return false;

      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = startTime.hours * 60 + startTime.minutes;
      const endMinutes = endTime.hours * 60 + endTime.minutes;

      // Check if current time is within 30 minutes before start or during the reservation
      return nowMinutes >= startMinutes - 30 && nowMinutes <= endMinutes;
    });

    res.json(currentReservations);
  } catch (error) {
    console.error("Error getting current reservations:", error);
    res.status(500).json({ error: "Failed to get current reservations" });
  }
});

/**
 * GET /api/reservations/:id
 * Get a specific reservation by ID
 */
app.get("/api/reservations/:id", async (req: Request, res: Response) => {
  try {
    const reservation = await storage.getReservation(req.params.id);
    if (reservation) {
      res.json(reservation);
    } else {
      res.status(404).json({ error: "Reservation not found" });
    }
  } catch (error) {
    console.error("Error getting reservation:", error);
    res.status(500).json({ error: "Failed to get reservation" });
  }
});

/**
 * POST /api/reservations
 * Manually add a reservation (for testing or manual entry)
 */
app.post("/api/reservations", async (req: Request, res: Response) => {
  try {
    const reservation: Reservation = {
      ...req.body,
      id: req.body.id || `res_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      date: new Date(req.body.date),
      createdAt: new Date(),
    };

    await storage.addReservation(reservation);
    res.status(201).json(reservation);
  } catch (error) {
    console.error("Error adding reservation:", error);
    res.status(500).json({ error: "Failed to add reservation" });
  }
});

/**
 * DELETE /api/reservations/:id
 * Delete a reservation
 */
app.delete("/api/reservations/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await storage.deleteReservation(req.params.id);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Reservation not found" });
    }
  } catch (error) {
    console.error("Error deleting reservation:", error);
    res.status(500).json({ error: "Failed to delete reservation" });
  }
});

/**
 * POST /api/check-emails
 * Manually trigger email check
 */
app.post("/api/check-emails", async (req: Request, res: Response) => {
  if (!emailChecker) {
    res.status(503).json({ error: "Email checking not configured" });
    return;
  }

  try {
    await emailChecker.checkEmails();
    res.json({ success: true, message: "Email check completed" });
  } catch (error) {
    console.error("Error checking emails:", error);
    res.status(500).json({ error: "Failed to check emails" });
  }
});

// Helper function to parse time string
function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toLowerCase();

  if (period === "pm" && hours !== 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;

  return { hours, minutes };
}

// Start server
async function startServer() {
  try {
    // Load configuration from Key Vault (with .env fallback)
    const config = await initConfig();

    // Connect to Redis
    await connectRedis();

    // Initialize email checker with loaded configuration
    initializeEmailChecker(config);

    // Start Express server
    app.listen(port, () => {
      console.log(`Email parser service listening on port ${port}`);
      console.log(`Email checking: ${emailChecker ? "enabled" : "disabled"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
