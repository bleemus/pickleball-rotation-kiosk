import "dotenv/config";
import express from "express";
import cors from "cors";
import { initRedis, closeRedis } from "./services/redis";
import gameRoutes from "./routes/game";
import reservationRoutes from "./routes/reservations";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
