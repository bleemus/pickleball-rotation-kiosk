import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create Redis client
const redisClient = createClient({
  url: REDIS_URL,
});

// Error handling
redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

// Connect to Redis
export async function connectRedis() {
  try {
    await redisClient.connect();
    console.log("✅ Connected to Redis");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    throw error;
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing Redis connection...");
  await redisClient.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing Redis connection...");
  await redisClient.quit();
  process.exit(0);
});

export default redisClient;
