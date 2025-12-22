import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import { EmailChecker } from "./services/emailChecker";
import { ReservationStorage } from "./services/reservationStorage";
import { Reservation } from "./types/reservation";

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize storage
const storage = new ReservationStorage();

// Initialize email checker if credentials are provided
let emailChecker: EmailChecker | null = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  emailChecker = new EmailChecker(
    {
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD,
      host: process.env.EMAIL_HOST || "imap.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "993"),
      tls: process.env.EMAIL_TLS !== "false",
    },
    (reservation: Reservation) => {
      storage.addReservation(reservation);
    }
  );

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
} else {
  console.warn("Email credentials not configured. Email checking disabled.");
  console.warn("Set EMAIL_USER and EMAIL_PASSWORD in .env file");
}

// Routes

/**
 * GET /health
 * Health check endpoint
 */
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    emailEnabled: emailChecker !== null,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/reservations
 * Get all reservations or filter by query params
 */
app.get("/api/reservations", (req: Request, res: Response) => {
  try {
    const { date, startTime, endTime } = req.query;

    if (date || startTime || endTime) {
      const results = storage.queryReservations({
        date: date as string,
        startTime: startTime as string,
        endTime: endTime as string,
      });
      res.json(results);
    } else {
      const results = storage.getAllReservations();
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
app.get("/api/reservations/today", (req: Request, res: Response) => {
  try {
    const results = storage.getTodayReservations();
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
app.get("/api/reservations/current", (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayReservations = storage.queryReservations({ date: todayStr });

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
app.get("/api/reservations/:id", (req: Request, res: Response) => {
  try {
    const reservation = storage.getReservation(req.params.id);
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
app.post("/api/reservations", (req: Request, res: Response) => {
  try {
    const reservation: Reservation = {
      ...req.body,
      id: req.body.id || `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: new Date(req.body.date),
      createdAt: new Date(),
    };

    storage.addReservation(reservation);
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
app.delete("/api/reservations/:id", (req: Request, res: Response) => {
  try {
    const deleted = storage.deleteReservation(req.params.id);
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
app.listen(port, () => {
  console.log(`Email parser service listening on port ${port}`);
  console.log(`Email checking: ${emailChecker ? "enabled" : "disabled"}`);
});
