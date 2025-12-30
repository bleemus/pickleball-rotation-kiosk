// Application Insights must be initialized before other imports
import appInsights from "applicationinsights";
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights.setup().start();
}

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { initRedis, closeRedis } from "./services/redis.js";
import gameRoutes from "./routes/game.js";
import reservationRoutes from "./routes/reservations.js";
import { logger } from "./services/logger.js";

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Log which configuration keys are set at startup
 */
function logConfiguration(): void {
  const status = (value: string | undefined): string => (value ? "✓" : "✗");

  logger.info("Backend configuration:");
  logger.info(`  PORT: ${status(String(PORT))} | NODE_ENV: ${status(process.env.NODE_ENV)}`);
  logger.info(
    `  REDIS_URL: ${status(process.env.REDIS_URL)} | LOG_LEVEL: ${status(process.env.LOG_LEVEL)}`
  );
  logger.info(
    `  WIFI_SSID: ${status(process.env.WIFI_SSID)} | WIFI_PASSWORD: ${status(process.env.WIFI_PASSWORD)}`
  );
  logger.info(
    `  APPLICATIONINSIGHTS: ${status(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)}`
  );
}

// Disable ETag to prevent 304 responses - this is a real-time app that needs fresh data
app.set("etag", false);

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

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    };

    if (res.statusCode >= 500) {
      logger.error("HTTP request", logData);
    } else if (res.statusCode >= 400) {
      logger.warn("HTTP request", logData);
    } else {
      logger.info("HTTP request", logData);
    }
  });

  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api", gameRoutes);
app.use("/api/reservations", reservationRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
});

// Start server
async function startServer() {
  try {
    // Log configuration at startup
    logConfiguration();

    // Initialize Redis connection
    await initRedis();
    logger.info("Redis initialized");

    // Start Express server
    app.listen(PORT, () => {
      logger.info("Server started", { port: PORT });
    });
  } catch (error) {
    logger.error("Failed to start server", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await closeRedis();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await closeRedis();
  process.exit(0);
});

startServer();
