import { createClient } from "redis";
import { logger, errorDetails } from "./logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create Redis client
const redisClient = createClient({
  url: REDIS_URL,
});

// Error handling
redisClient.on("error", (err: Error) => {
  logger.error("Redis client error", errorDetails(err));
});

// Connect to Redis
export async function connectRedis() {
  try {
    await redisClient.connect();
    logger.info("Connected to Redis");
  } catch (error) {
    logger.error("Failed to connect to Redis", errorDetails(error));
    throw error;
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing Redis connection");
  await redisClient.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, closing Redis connection");
  await redisClient.quit();
  process.exit(0);
});

export default redisClient;
