import "dotenv/config";
import express from "express";
import cors from "cors";
import { initRedis, closeRedis } from "./services/redis";
import gameRoutes from "./routes/game";
import reservationRoutes from "./routes/reservations";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - restrict to known origins in production, allow all in development/test
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
  "http://localhost",
  "http://127.0.0.1:3000",
  "http://127.0.0.1",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // In production, restrict to allowed origins only
      // In development/test, allow all origins for testing flexibility
      if (process.env.NODE_ENV === "production") {
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      } else {
        // Development/test mode - allow all origins
        callback(null, true);
      }
    },
    credentials: true,
  })
);

// JSON body parser with size limit to prevent DoS
app.use(express.json({ limit: "100kb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api", gameRoutes);
app.use("/api/reservations", reservationRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
async function startServer() {
  try {
    // Initialize Redis connection
    await initRedis();
    console.log("Redis initialized");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Pickleball Kiosk API server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await closeRedis();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await closeRedis();
  process.exit(0);
});

startServer();
